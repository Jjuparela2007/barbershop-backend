const { pool } = require('../../config/database');

// Listar todos los barberos activos con su perfil
async function getAll() {
  const [rows] = await pool.query(
    `SELECT 
       u.id, u.name, u.email, u.phone, u.avatar_url,
       bp.bio, bp.specialties, bp.instagram, bp.experience_years
     FROM users u
     LEFT JOIN barber_profiles bp ON bp.barber_id = u.id
     WHERE u.role = 'barber' AND u.is_active = 1
     ORDER BY u.name ASC`
  );
  return rows;
}

// Obtener un barbero por ID con su perfil y horarios
async function getById(id) {
  // 1. Datos del barbero
  const [rows] = await pool.query(
    `SELECT 
       u.id, u.name, u.email, u.phone, u.avatar_url,
       bp.bio, bp.specialties, bp.instagram, bp.experience_years
     FROM users u
     LEFT JOIN barber_profiles bp ON bp.barber_id = u.id
     WHERE u.id = ? AND u.role = 'barber' AND u.is_active = 1`,
    [id]
  );

  if (!rows[0]) {
    throw { status: 404, message: 'Barbero no encontrado' };
  }

  const barber = rows[0];

  // 2. Horarios semanales del barbero
  const [schedules] = await pool.query(
    `SELECT day_of_week, start_time, end_time, break_start, break_end
     FROM barber_schedules
     WHERE barber_id = ?
     ORDER BY day_of_week ASC`,
    [id]
  );

  barber.schedules = schedules

// Galería
const [gallery] = await pool.query(
  `SELECT id, image_url, caption, order_num
   FROM barber_gallery
   WHERE barber_id = ?
   ORDER BY order_num ASC`,
  [id]
)
barber.gallery = gallery

return barber
}

// Obtener horarios de un barbero
async function getSchedule(barberId) {
  // Verificar que el barbero existe
  await getById(barberId);

  const [rows] = await pool.query(
    `SELECT day_of_week, start_time, end_time, break_start, break_end
     FROM barber_schedules
     WHERE barber_id = ?
     ORDER BY day_of_week ASC`,
    [barberId]
  );

  return rows;
}

// Actualizar horario de un barbero (admin o el mismo barbero)
async function updateSchedule(barberId, schedules) {
  // Verificar que el barbero existe
  await getById(barberId);

  // Borrar horarios actuales y reemplazarlos
  await pool.query('DELETE FROM barber_schedules WHERE barber_id = ?', [barberId]);

  if (schedules.length === 0) return [];

  const values = schedules.map(s => [
    barberId,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.break_start || null,
    s.break_end   || null,
  ]);

  await pool.query(
    `INSERT INTO barber_schedules 
     (barber_id, day_of_week, start_time, end_time, break_start, break_end)
     VALUES ?`,
    [values]
  );

  return getSchedule(barberId);
}

// Agregar bloqueo de tiempo
async function addBlockedTime(barberId, { blocked_date, start_time, end_time, reason }) {
  await getById(barberId);

  const [result] = await pool.query(
    `INSERT INTO barber_blocked_times (barber_id, blocked_date, start_time, end_time, reason)
     VALUES (?, ?, ?, ?, ?)`,
    [barberId, blocked_date, start_time || null, end_time || null, reason || null]
  );

  return { id: result.insertId, barberId, blocked_date, start_time, end_time, reason };
}
// Obtener galería de un barbero
async function getGallery(barberId) {
  const [rows] = await pool.query(
    `SELECT id, image_url, caption, order_num
     FROM barber_gallery
     WHERE barber_id = ?
     ORDER BY order_num ASC, created_at ASC`,
    [barberId]
  )
  return rows
}

// Agregar imagen a la galería
async function addGalleryImage(barberId, { image_url, caption, order_num }) {
  const [result] = await pool.query(
    `INSERT INTO barber_gallery (barber_id, image_url, caption, order_num)
     VALUES (?, ?, ?, ?)`,
    [barberId, image_url, caption || null, order_num || 0]
  )
  return { id: result.insertId, image_url, caption, order_num }
}

// Eliminar imagen de la galería
async function deleteGalleryImage(imageId, barberId) {
  const [rows] = await pool.query(
    'SELECT id FROM barber_gallery WHERE id = ? AND barber_id = ?',
    [imageId, barberId]
  )

  if (!rows[0]) {
    throw { status: 404, message: 'Imagen no encontrada' }
  }

  await pool.query('DELETE FROM barber_gallery WHERE id = ?', [imageId])
  return { message: 'Imagen eliminada' }
}

module.exports = { getAll, getById, getSchedule, updateSchedule, addBlockedTime, getGallery, addGalleryImage, deleteGalleryImage }