const { validationResult } = require('express-validator');
const barbersService = require('./barbers.service');
const res_ = require('../../utils/response');

async function getAll(req, res) {
  try {
    const barbers = await barbersService.getAll();
    return res_.ok(res, { barbers });
  } catch (err) {
    return res_.serverError(res, err);
  }
}

async function getById(req, res) {
  try {
    const barber = await barbersService.getById(req.params.id);
    return res_.ok(res, { barber });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

async function getSchedule(req, res) {
  try {
    const schedule = await barbersService.getSchedule(req.params.id);
    return res_.ok(res, { schedule });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

async function updateSchedule(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const schedule = await barbersService.updateSchedule(req.params.id, req.body.schedules);
    return res_.ok(res, { schedule });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}

async function addBlockedTime(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res_.error(res, errors.array()[0].msg, 422);
  }

  try {
    const blocked = await barbersService.addBlockedTime(req.params.id, req.body);
    return res_.created(res, { blocked });
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status);
    return res_.serverError(res, err);
  }
}
async function getGallery(req, res) {
  try {
    const gallery = await barbersService.getGallery(req.params.id)
    return res_.ok(res, { gallery })
  } catch (err) {
    return res_.serverError(res, err)
  }
}

async function addGalleryImage(req, res) {
  try {
    const image = await barbersService.addGalleryImage(req.params.id, req.body)
    return res_.created(res, { image })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

async function deleteGalleryImage(req, res) {
  try {
    const result = await barbersService.deleteGalleryImage(req.params.imageId, req.params.id)
    return res_.ok(res, result)
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}
async function uploadAvatar(req, res) {
  try {
    if (!req.file) return res_.error(res, 'No se envió ninguna imagen', 400)
    const avatarUrl = `/uploads/barbers/${req.file.filename}`
    await barbersService.updateAvatarUrl(req.params.id, avatarUrl)
    return res_.ok(res, { avatar_url: avatarUrl })
  } catch (err) {
    return res_.serverError(res, err)
  }
}

module.exports = { getAll, getById, getSchedule, updateSchedule, addBlockedTime, getGallery, addGalleryImage, deleteGalleryImage, uploadAvatar }
