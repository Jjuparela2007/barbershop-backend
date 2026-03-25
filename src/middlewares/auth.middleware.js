const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, jwtConfig.secret);

    req.user = {
      id:    payload.id,
      email: payload.email,
      role:  payload.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado, inicia sesión nuevamente' });
    }
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

module.exports = { authenticate };