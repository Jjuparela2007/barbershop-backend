const { Router } = require('express')
const { body }   = require('express-validator')
const controller = require('./users.controller')
const { authenticate } = require('../../middlewares/auth.middleware')
const { authorize }    = require('../../middlewares/role.middleware')

const router = Router()

// ── Rutas del usuario logueado ────────────────────────────────
router.put('/me',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('email').optional().trim().isEmail().withMessage('Correo inválido'),
  ],
  controller.updateMe
)

router.put('/me/password',
  authenticate,
  [
    body('current_password').notEmpty().withMessage('La contraseña actual es obligatoria'),
    body('new_password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  ],
  controller.updateMyPassword
)

router.put('/me/barber-profile',
  authenticate,
  authorize('barber'),
  controller.updateMyBarberProfile
)

// ── Rutas del admin ───────────────────────────────────────────
router.put('/:id',
  authenticate,
  authorize('admin'),
  [
    body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('email').optional().trim().isEmail().withMessage('Correo inválido'),
  ],
  controller.updateUser
)

router.put('/:id/password',
  authenticate,
  authorize('admin'),
  [
    body('new_password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  ],
  controller.resetPassword
)

router.put('/:id/barber-profile',
  authenticate,
  authorize('admin'),
  controller.updateBarberProfile
)

module.exports = router