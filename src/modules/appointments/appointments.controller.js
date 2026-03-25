const { validationResult } = require('express-validator');
const appointmentsService  = require('./appointments.service');
const res_ = require('../../utils/response');

// GET /api/appointments/availability?barber_id=2&date=2026-04-01&service_id=1
async function getAvailability(req, res) {
  try {
    const { barber_id, date, service_id } = req.query;

    if (!barber_id || !date || !service_id) {
      return res_.error(res, 'barber_id, date y service_id son obligatorios', 422);
    }

    // Obtener duración del servicio
    const { pool } = require('../../config/database');
    const [serviceRows] = await pool.query(
      'SELECT duration_minutes FROM services WHERE id = ?',
      [service_id]
    );

    if (!serviceRows[0]) {
      return res_.error(res, 'Servicio no encontrado', 404);
    }

    const slots = await appointmentsService.getAvailableSlots(
      barber_id,
      date,
      serviceRows[0].duration_minutes
    );

    return res_.ok(res, { date, slots });
  } catch (err) {
    return res_.serverError(res, err);
  }
}

// POST /api/appointments
async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const appointment = await appointmentsService.create({
      client_id: req.user.id, // viene del token JWT
      ...req.body,
    });
    return res_.created(res, { appointment });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

// GET /api/appointments/my
async function getMine(req, res) {
  try {
    const appointments = await appointmentsService.getByClient(req.user.id);
    return res_.ok(res, { appointments });
  } catch (err) {
    return res_.serverError(res, err);
  }
}

// GET /api/appointments/barber/:id
async function getByBarber(req, res) {
  try {
    const appointments = await appointmentsService.getByBarber(
      req.params.id,
      req.query.date
    );
    return res_.ok(res, { appointments });
  } catch (err) {
    return res_.serverError(res, err);
  }
}

// GET /api/appointments/:id
async function getById(req, res) {
  try {
    const appointment = await appointmentsService.getById(req.params.id);
    return res_.ok(res, { appointment });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

// PATCH /api/appointments/:id/status
async function updateStatus(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const appointment = await appointmentsService.updateStatus(
      req.params.id,
      req.body.status,
      req.user.id,
      req.body.reason
    );
    return res_.ok(res, { appointment });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}
async function createWalkIn(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res_.error(res, errors.array()[0].msg, 422)

  try {
    const appointment = await appointmentsService.createWalkIn({
      barber_id:   req.user.id,
      service_id:  req.body.service_id,
      client_name: req.body.client_name,
      notes:       req.body.notes,
    })
    return res_.created(res, { appointment })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

// Obtener ventas walk-in de un barbero
// Obtener ventas walk-in de un barbero
async function getWalkInSales(req, res) {
  try {
    const barberId = req.params.barberId;
    const { date } = req.query;
    
    if (!date) {
      return res_.error(res, 'La fecha es requerida', 400);
    }
    
    const appointments = await appointmentsService.getWalkInSales(barberId, date);
    
    // Usar el mismo formato que otras funciones del controlador
    // Probablemente es res_.ok o res_.json
    return res_.ok(res, { appointments });  // 👈 Cambia según tu helper
    
  } catch (err) {
    console.error('Error en getWalkInSales:', err);
    return res_.serverError(res, err);
  }
}

module.exports = { getAvailability, create, getMine, getByBarber, getById, updateStatus, createWalkIn, getWalkInSales, }