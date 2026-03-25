const { Router } = require('express')
const { body }   = require('express-validator')
const controller = require('./ratings.controller')
const { authenticate } = require('../../middlewares/auth.middleware')
const { authorize }    = require('../../middlewares/role.middleware')

const router = Router()

// Cliente califica una cita
router.post('/',
  authenticate,
  authorize('client'),
  [
    body('appointment_id').notEmpty().isInt().withMessage('appointment_id inválido'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser entre 1 y 5'),
    body('comment').optional().isLength({ max: 500 }).withMessage('Comentario muy largo'),
  ],
  controller.createRating
)

// Ver calificaciones de un barbero (público)
router.get('/barber/:id', controller.getBarberRatings)

// Ver resumen de todos los barberos (solo admin)
router.get('/summary',
  authenticate,
  authorize('admin'),
  controller.getAllBarbersRatings
)

module.exports = router