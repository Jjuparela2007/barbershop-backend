const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool }        = require('../../config/database');
const { jwt: jwtCfg } = require('../../config/env');

// ── Registro ──────────────────────────────────
async function register({ name, email, password, phone }) {
  // 1. Verificar que el email no esté en uso
  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existing.length > 0) {
    throw { status: 409, message: 'Este correo ya está registrado' };
  }

  // 2. Hashear la contraseña (nunca guardar texto plano)
  const password_hash = await bcrypt.hash(password, 10);

  // 3. Insertar el usuario en la BD
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, phone)
     VALUES (?, ?, ?, ?)`,
    [name, email, password_hash, phone || null]
  );

  // 4. Generar token para que quede logueado inmediatamente
  const token = generateToken({
    id:   result.insertId,
    email,
    role: 'client',
  });

  return {
    token,
    user: {
      id:    result.insertId,
      name,
      email,
      role: 'client',
    },
  };
}

// ── Login ──────────────────────────────────────
async function login({ email, password }) {
  // 1. Buscar usuario por email
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?',
    [email]
  );

  const user = rows[0];

  // 2. Mismo mensaje si no existe o si la contraseña es incorrecta
  //    (no damos pistas de qué emails están registrados)
  if (!user) {
    throw { status: 401, message: 'Credenciales incorrectas' };
  }

  // 3. Verificar cuenta activa
  if (!user.is_active) {
    throw { status: 403, message: 'Cuenta desactivada, contacta al administrador' };
  }

  // 4. Comparar contraseña con el hash
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw { status: 401, message: 'Credenciales incorrectas' };
  }

  // 5. Generar token
  const token = generateToken({
    id:    user.id,
    email: user.email,
    role:  user.role,
  });

  return {
    token,
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
  };
}

// ── Mi perfil ──────────────────────────────────
async function getMe(userId) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, avatar_url, created_at
     FROM users
     WHERE id = ? AND is_active = 1`,
    [userId]
  );

  if (!rows[0]) {
    throw { status: 404, message: 'Usuario no encontrado' };
  }

  return rows[0];
}

// ── Helper privado ─────────────────────────────
function generateToken(payload) {
  return jwt.sign(payload, jwtCfg.secret, { expiresIn: jwtCfg.expiresIn });
}

module.exports = { register, login, getMe };