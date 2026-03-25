const { validationResult } = require('express-validator');
const authService = require('./auth.service');
const res_        = require('../../utils/response');

// POST /api/auth/register
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const { name, email, password, phone } = req.body;
    const result = await authService.register({ name, email, password, phone });
    return res_.created(res, result);
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

// POST /api/auth/login
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res_.ok(res, result);
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const user = await authService.getMe(req.user.id);
    return res_.ok(res, { user });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

module.exports = { register, login, getMe };