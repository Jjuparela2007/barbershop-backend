const { validationResult } = require('express-validator');
const servicesService = require('./services.service');
const res_ = require('../../utils/response');

async function getAll(req, res) {
  try {
    const services = await servicesService.getAll();
    return res_.ok(res, { services });
  } catch (err) {
    return res_.serverError(res, err);
  }
}

async function getById(req, res) {
  try {
    const service = await servicesService.getById(req.params.id);
    return res_.ok(res, { service });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const service = await servicesService.create(req.body);
    return res_.created(res, { service });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const service = await servicesService.update(req.params.id, req.body);
    return res_.ok(res, { service });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    const result = await servicesService.remove(req.params.id);
    return res_.ok(res, result);
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

module.exports = { getAll, getById, create, update, remove };