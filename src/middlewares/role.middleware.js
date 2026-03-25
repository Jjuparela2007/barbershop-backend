const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ success: false, error: 'Autenticación requerida' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Acceso denegado. Se requiere rol: ${allowedRoles.join(' o ')}` 
      });
    }

    next();
  };
};

module.exports = { authorize };