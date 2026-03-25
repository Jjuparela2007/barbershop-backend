const { pool } = require('../../config/database')
const bcrypt   = require('bcryptjs')

// Actualizar datos básicos de cualquier usuario
async function updateUser(userId, { name, email, phone }) {
  // Verificar que el email no esté en uso por otro usuario
  if (email) {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    )
    if (existing.length > 0) {
      throw { status: 409, message: 'Este correo ya está en uso' }
    }
  }

  await pool.query(
    `UPDATE users SET
       name  = COALESCE(?, name),
       email = COALESCE(?, email),
       phone = COALESCE(?, phone)
     WHERE id = ?`,
    [name || null, email || null, phone || null, userId]
  )

  const [rows] = await pool.query(
    'SELECT id, name, email, phone, role FROM users WHERE id = ?',
    [userId]
  )
  return rows[0]
}

// Cambiar contraseña
async function updatePassword(userId, { current_password, new_password }) {
  const [rows] = await pool.query(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId]
  )

  if (!rows[0]) throw { status: 404, message: 'Usuario no encontrado' }

  const isValid = await bcrypt.compare(current_password, rows[0].password_hash)
  if (!isValid) throw { status: 401, message: 'Contraseña actual incorrecta' }

  const password_hash = await bcrypt.hash(new_password, 10)
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId])

  return { message: 'Contraseña actualizada correctamente' }
}

// Cambiar contraseña sin verificar la actual (solo admin)
async function resetPassword(userId, new_password) {
  const password_hash = await bcrypt.hash(new_password, 10)
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId])
  return { message: 'Contraseña reseteada correctamente' }
}

// Actualizar perfil de barbero
async function updateBarberProfile(barberId, { specialties, experience_years, bio, instagram }) {
  // Verificar que existe el perfil
  const [existing] = await pool.query(
    'SELECT id FROM barber_profiles WHERE barber_id = ?',
    [barberId]
  )

  if (existing.length === 0) {
    // Crear perfil si no existe
    await pool.query(
      `INSERT INTO barber_profiles (barber_id, specialties, experience_years, bio, instagram)
       VALUES (?, ?, ?, ?, ?)`,
      [barberId, specialties || null, experience_years || 0, bio || null, instagram || null]
    )
  } else {
    await pool.query(
      `UPDATE barber_profiles SET
         specialties      = COALESCE(?, specialties),
         experience_years = COALESCE(?, experience_years),
         bio              = COALESCE(?, bio),
         instagram        = COALESCE(?, instagram)
       WHERE barber_id = ?`,
      [specialties || null, experience_years ?? null, bio || null, instagram || null, barberId]
    )
  }

  const [rows] = await pool.query(
    'SELECT * FROM barber_profiles WHERE barber_id = ?',
    [barberId]
  )
  return rows[0]
}

module.exports = { updateUser, updatePassword, resetPassword, updateBarberProfile }