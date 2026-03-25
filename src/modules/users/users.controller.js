const { validationResult } = require('express-validator')
const usersService = require('./users.service')
const res_         = require('../../utils/response')

// PUT /api/users/me — el usuario edita su propio perfil
async function updateMe(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res_.error(res, errors.array()[0].msg, 422)

  try {
    const user = await usersService.updateUser(req.user.id, req.body)
    return res_.ok(res, { user })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

// PUT /api/users/me/password — el usuario cambia su propia contraseña
async function updateMyPassword(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res_.error(res, errors.array()[0].msg, 422)

  try {
    const result = await usersService.updatePassword(req.user.id, req.body)
    return res_.ok(res, result)
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

// PUT /api/users/me/barber-profile — el barbero edita su perfil
async function updateMyBarberProfile(req, res) {
  try {
    const profile = await usersService.updateBarberProfile(req.user.id, req.body)
    return res_.ok(res, { profile })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

// PUT /api/users/:id — admin edita cualquier usuario
async function updateUser(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res_.error(res, errors.array()[0].msg, 422)

  try {
    const user = await usersService.updateUser(req.params.id, req.body)
    return res_.ok(res, { user })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

// PUT /api/users/:id/password — admin resetea contraseña
async function resetPassword(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res_.error(res, errors.array()[0].msg, 422)

  try {
    const result = await usersService.resetPassword(req.params.id, req.body.new_password)
    return res_.ok(res, result)
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

// PUT /api/users/:id/barber-profile — admin edita perfil de barbero
async function updateBarberProfile(req, res) {
  try {
    const profile = await usersService.updateBarberProfile(req.params.id, req.body)
    return res_.ok(res, { profile })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

module.exports = { updateMe, updateMyPassword, updateMyBarberProfile, updateUser, resetPassword, updateBarberProfile }