const { pool } = require('../../config/database')

const CATEGORIES = ['accesorios', 'ropa', 'barberia']

// ── Productos ──────────────────────────────────────────────────
async function getProducts({ category } = {}) {
  let query = `
    SELECT id, name, description, category, price, stock, image_url
    FROM products
    WHERE is_active = 1`
  const params = []
  if (category) { query += ' AND category = ?'; params.push(category) }
  query += ' ORDER BY category, name'
  const [rows] = await pool.query(query, params)
  return rows
}

async function getProductById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM products WHERE id = ? AND is_active = 1', [id]
  )
  if (!rows[0]) throw { status: 404, message: 'Producto no encontrado' }
  return rows[0]
}

async function createProduct({ name, description, category, price, stock, image_url }) {
  if (!CATEGORIES.includes(category)) {
    throw { status: 400, message: 'Categoría inválida' }
  }
  const [result] = await pool.query(
    `INSERT INTO products (name, description, category, price, stock, image_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description || null, category, price, stock || 0, image_url || null]
  )
  return getProductById(result.insertId)
}

async function updateProduct(id, fields) {
  await getProductById(id)
  const { name, description, category, price, stock, image_url, is_active } = fields
  await pool.query(
    `UPDATE products SET
       name        = COALESCE(?, name),
       description = COALESCE(?, description),
       category    = COALESCE(?, category),
       price       = COALESCE(?, price),
       stock       = COALESCE(?, stock),
       image_url   = COALESCE(?, image_url),
       is_active   = COALESCE(?, is_active)
     WHERE id = ?`,
    [name||null, description||null, category||null, price||null, stock??null, image_url||null, is_active??null, id]
  )
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id])
  return rows[0]
}

// ── Órdenes ────────────────────────────────────────────────────
async function createOrder(clientId, items, notes) {
  // items = [{ product_id, quantity }]
  if (!items?.length) throw { status: 400, message: 'El carrito está vacío' }

  // Verificar stock y calcular total
  let total = 0
  const enriched = []
  for (const item of items) {
    const [rows] = await pool.query(
      'SELECT id, name, price, stock FROM products WHERE id = ? AND is_active = 1',
      [item.product_id]
    )
    if (!rows[0]) throw { status: 404, message: `Producto ${item.product_id} no encontrado` }
    if (rows[0].stock < item.quantity) {
      throw { status: 409, message: `Stock insuficiente para ${rows[0].name}` }
    }
    total += rows[0].price * item.quantity
    enriched.push({ ...item, unit_price: rows[0].price, name: rows[0].name })
  }

  // Crear la orden
  const [orderResult] = await pool.query(
    'INSERT INTO orders (client_id, total, notes) VALUES (?, ?, ?)',
    [clientId, total, notes || null]
  )
  const orderId = orderResult.insertId

  // Insertar items y descontar stock
  for (const item of enriched) {
    await pool.query(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [orderId, item.product_id, item.quantity, item.unit_price]
    )
    await pool.query(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [item.quantity, item.product_id]
    )
  }

  return getOrderById(orderId)
}

async function getOrderById(id) {
  const [orders] = await pool.query(
    `SELECT o.id, o.total, o.status, o.notes, o.created_at,
            u.name AS client_name
     FROM orders o
     JOIN users u ON u.id = o.client_id
     WHERE o.id = ?`, [id]
  )
  if (!orders[0]) throw { status: 404, message: 'Orden no encontrada' }

  const [items] = await pool.query(
    `SELECT oi.quantity, oi.unit_price,
            p.name AS product_name, p.category
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`, [id]
  )
  return { ...orders[0], items }
}

async function getMyOrders(clientId) {
  const [orders] = await pool.query(
    `SELECT o.id, o.total, o.status, o.created_at,
            COUNT(oi.id) AS item_count
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.client_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC`, [clientId]
  )
  return orders
}

async function getAllOrders() {
  const [rows] = await pool.query(
    `SELECT o.id, o.total, o.status, o.created_at,
            u.name AS client_name,
            COUNT(oi.id) AS item_count
     FROM orders o
     JOIN users u ON u.id = o.client_id
     JOIN order_items oi ON oi.order_id = o.id
     GROUP BY o.id
     ORDER BY o.created_at DESC`
  )
  return rows
}

async function updateOrderStatus(id, status) {
  await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id])
  return getOrderById(id)
}

module.exports = { getProducts, getProductById, createProduct, updateProduct, createOrder, getOrderById, getMyOrders, getAllOrders, updateOrderStatus }