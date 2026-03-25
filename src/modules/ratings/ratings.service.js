const { pool } = require('../../config/database')

// Calificar una cita completada
async function createRating({ client_id, appointment_id, rating, comment }) {
  // Verificar que la cita existe, está completada y pertenece al cliente
  const [apptRows] = await pool.query(
    `SELECT id, barber_id, client_id, status
     FROM appointments
     WHERE id = ?`,
    [appointment_id]
  )

  if (!apptRows[0]) {
    throw { status: 404, message: 'Cita no encontrada' }
  }

  const appt = apptRows[0]

  if (appt.client_id !== client_id) {
    throw { status: 403, message: 'No puedes calificar esta cita' }
  }

  if (appt.status !== 'completed') {
    throw { status: 400, message: 'Solo puedes calificar citas completadas' }
  }

  // Verificar que no haya calificado ya esta cita
  const [existing] = await pool.query(
    'SELECT id FROM barber_ratings WHERE appointment_id = ?',
    [appointment_id]
  )

  if (existing.length > 0) {
    throw { status: 409, message: 'Ya calificaste esta cita' }
  }

  // Insertar calificación
  const [result] = await pool.query(
    `INSERT INTO barber_ratings (barber_id, client_id, appointment_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [appt.barber_id, client_id, appointment_id, rating, comment || null]
  )

  return { id: result.insertId, rating, comment }
}

// Obtener calificaciones de un barbero
async function getBarberRatings(barberId) {
  const [rows] = await pool.query(
    `SELECT 
       r.id, r.rating, r.comment, r.created_at,
       u.name AS client_name
     FROM barber_ratings r
     JOIN users u ON u.id = r.client_id
     WHERE r.barber_id = ?
     ORDER BY r.created_at DESC`,
    [barberId]
  )

  // Calcular promedio
  const avg = rows.length > 0
    ? (rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(1)
    : null

  return { ratings: rows, average: avg, total: rows.length }
}

// Obtener resumen de todos los barberos (para admin)
async function getAllBarbersRatings() {
  const [rows] = await pool.query(
    `SELECT 
       u.id, u.name,
       COUNT(r.id)        AS total_ratings,
       AVG(r.rating)      AS average,
       MIN(r.rating)      AS min_rating,
       MAX(r.rating)      AS max_rating
     FROM users u
     LEFT JOIN barber_ratings r ON r.barber_id = u.id
     WHERE u.role = 'barber' AND u.is_active = 1
     GROUP BY u.id, u.name
     ORDER BY average DESC`
  )

  return rows.map(r => ({
    ...r,
    average: r.average ? parseFloat(r.average).toFixed(1) : null,
  }))
}

module.exports = { createRating, getBarberRatings, getAllBarbersRatings }