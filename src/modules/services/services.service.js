const { pool } = require('../../config/database');

async function getAll() {
  const [rows] = await pool.query(
    `SELECT id, name, description, duration_minutes, price, display_order, image_url
     FROM services
     WHERE is_active = 1
     ORDER BY display_order ASC`
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, description, duration_minutes, price, image_url
     FROM services
     WHERE id = ? AND is_active = 1`,
    [id]
  );

  if (!rows[0]) {
    throw { status: 404, message: 'Servicio no encontrado' };
  }

  return rows[0];
}

async function create({ name, description, duration_minutes, price, display_order }) {
  const [result] = await pool.query(
    `INSERT INTO services (name, description, duration_minutes, price, display_order)
     VALUES (?, ?, ?, ?, ?)`,
    [name, description || null, duration_minutes, price, display_order || 0]
  );

  return getById(result.insertId);
}

async function update(id, fields) {
  await getById(id);

  const { name, description, duration_minutes, price, display_order } = fields;

  await pool.query(
    `UPDATE services
     SET name = ?, description = ?, duration_minutes = ?, price = ?, display_order = ?
     WHERE id = ?`,
    [name, description || null, duration_minutes, price, display_order || 0, id]
  );

  return getById(id);
}

async function remove(id) {
  await getById(id);

  await pool.query(
    'UPDATE services SET is_active = 0 WHERE id = ?',
    [id]
  );

  return { message: 'Servicio desactivado correctamente' };
}

async function updateImageUrl(id, imageUrl) {
  const [result] = await pool.query(
    'UPDATE services SET image_url = ? WHERE id = ?',
    [imageUrl, id]
  );
  return result;
}

module.exports = { getAll, getById, create, update, remove, updateImageUrl };