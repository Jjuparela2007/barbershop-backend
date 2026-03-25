const { pool } = require('../../config/database');

// Obtener todos los servicios activos
async function getAll() {
  const [rows] = await pool.query(
    `SELECT id, name, description, duration_minutes, price, display_order
     FROM services
     WHERE is_active = 1
     ORDER BY display_order ASC`
  );
  return rows;
}

// Obtener un servicio por ID
async function getById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, description, duration_minutes, price
     FROM services
     WHERE id = ? AND is_active = 1`,
    [id]
  );

  if (!rows[0]) {
    throw { status: 404, message: 'Servicio no encontrado' };
  }

  return rows[0];
}

// Crear servicio (solo admin)
async function create({ name, description, duration_minutes, price, display_order }) {
  const [result] = await pool.query(
    `INSERT INTO services (name, description, duration_minutes, price, display_order)
     VALUES (?, ?, ?, ?, ?)`,
    [name, description || null, duration_minutes, price, display_order || 0]
  );

  return getById(result.insertId);
}

// Actualizar servicio (solo admin)
async function update(id, fields) {
  await getById(id); // verifica que existe

  const { name, description, duration_minutes, price, display_order } = fields;

  await pool.query(
    `UPDATE services
     SET name = ?, description = ?, duration_minutes = ?, price = ?, display_order = ?
     WHERE id = ?`,
    [name, description || null, duration_minutes, price, display_order || 0, id]
  );

  return getById(id);
}

// Desactivar servicio (soft delete, solo admin)
async function remove(id) {
  await getById(id); // verifica que existe

  await pool.query(
    'UPDATE services SET is_active = 0 WHERE id = ?',
    [id]
  );

  return { message: 'Servicio desactivado correctamente' };
}

module.exports = { getAll, getById, create, update, remove };