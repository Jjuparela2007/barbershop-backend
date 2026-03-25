const { validationResult } = require('express-validator')
const ratingsService = require('./ratings.service')
const res_           = require('../../utils/response')

async function createRating(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res_.error(res, errors.array()[0].msg, 422)

  try {
    const rating = await ratingsService.createRating({
      client_id:      req.user.id,
      appointment_id: req.body.appointment_id,
      rating:         req.body.rating,
      comment:        req.body.comment,
    })
    return res_.created(res, { rating })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

async function getBarberRatings(req, res) {
  try {
    const result = await ratingsService.getBarberRatings(req.params.id)
    return res_.ok(res, result)
  } catch (err) {
    return res_.serverError(res, err)
  }
}

async function getAllBarbersRatings(req, res) {
  try {
    const result = await ratingsService.getAllBarbersRatings()
    return res_.ok(res, { barbers: result })
  } catch (err) {
    return res_.serverError(res, err)
  }
}

module.exports = { createRating, getBarberRatings, getAllBarbersRatings }