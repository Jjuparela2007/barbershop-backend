const { Router }       = require('express');
const { body }         = require('express-validator');
const controller       = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

    body('email')
      .trim()
      .notEmpty().withMessage('El correo es obligatorio')
      .isEmail().withMessage('Correo inválido')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('La contraseña es obligatoria')
      .isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres'),

    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Teléfono demasiado largo'),
  ],
  controller.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El correo es obligatorio')
      .isEmail().withMessage('Correo inválido')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('La contraseña es obligatoria'),
  ],
  controller.login
);

// GET /api/auth/me  ← ruta protegida
router.get('/me', authenticate, controller.getMe);

// PUT /api/auth/change-password  ← ruta protegida
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty().withMessage('Debes ingresar tu contraseña actual'),

    body('newPassword')
      .notEmpty().withMessage('La nueva contraseña es obligatoria')
      .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener mínimo 6 caracteres'),
  ],
  controller.changePassword
);

// PUT /api/auth/change-email  ← ruta protegida
router.put(
  '/change-email',
  authenticate,
  [
    body('newEmail')
      .trim()
      .notEmpty().withMessage('El nuevo correo es obligatorio')
      .isEmail().withMessage('Correo inválido')
      .normalizeEmail(),

    body('currentPassword')
      .notEmpty().withMessage('Debes ingresar tu contraseña para confirmar'),
  ],
  controller.changeEmail
);

module.exports = router;