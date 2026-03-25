    const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const created = (res, data) =>
  ok(res, data, 201);

const error = (res, message, status = 400) =>
  res.status(status).json({ success: false, error: message });

const serverError = (res, err) => {
  console.error('💥 Server error:', err);
  return error(res, 'Error interno del servidor', 500);
};

const unauthorized = (res, message = 'No autorizado') =>
  error(res, message, 401);

const forbidden = (res, message = 'Acceso denegado') =>
  error(res, message, 403);

const notFound = (res, message = 'Recurso no encontrado') =>
  error(res, message, 404);

module.exports = { ok, created, error, serverError, unauthorized, forbidden, notFound };