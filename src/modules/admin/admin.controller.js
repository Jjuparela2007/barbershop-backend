const { validationResult } = require('express-validator');
const adminService = require('./admin.service');
const res_ = require('../../utils/response');

async function getStats(req, res) {
  try {
    const stats = await adminService.getStats();
    return res_.ok(res, { stats });
  } catch (err) {
    return res_.serverError(res, err);
  }
}

async function getAllUsers(req, res) {
  try {
    const { role, is_active } = req.query;
    const users = await adminService.getAllUsers({
      role,
      is_active: is_active !== undefined ? parseInt(is_active) : undefined,
    });
    return res_.ok(res, { users });
  } catch (err) {
    return res_.serverError(res, err);
  }
}

async function toggleUserStatus(req, res) {
  try {
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res_.error(res, 'is_active es obligatorio', 422);
    }
    const result = await adminService.toggleUserStatus(req.params.id, is_active ? 1 : 0);
    return res_.ok(res, result);
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

async function createBarber(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const barber = await adminService.createBarber(req.body);
    return res_.created(res, { barber });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

async function getAllAppointments(req, res) {
  try {
    const { status, barber_id, date } = req.query;
    const appointments = await adminService.getAllAppointments({ status, barber_id, date });
    return res_.ok(res, { appointments });
  } catch (err) {
    return res_.serverError(res, err);
  }
}
async function getRevenueStats(req, res) {
  try {
    const stats = await adminService.getRevenueStats()
    return res_.ok(res, { stats })
  } catch (err) {
    return res_.serverError(res, err)
  }
}
async function getNetRevenue(req, res) {
  try {
    const data = await adminService.getNetRevenue()
    return res_.ok(res, { data })
  } catch (err) {
    return res_.serverError(res, err)
  }
}
async function getBarberStats(req, res) {
  try {
    const data = await adminService.getBarberStats()
    return res_.ok(res, { data })
  } catch (err) {
    return res_.serverError(res, err)
  }
}

module.exports = { getStats, getAllUsers, toggleUserStatus, createBarber, getAllAppointments, getRevenueStats, getNetRevenue, getBarberStats }