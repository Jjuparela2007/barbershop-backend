const { Router } = require('express');
const { body }   = require('express-validator');
const controller = require('./admin.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');

const router = Router();

// Todas las rutas requieren autenticación y rol admin
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/stats',          controller.getStats);
router.get('/revenue-stats',  controller.getRevenueStats);
router.get('/net-revenue',    controller.getNetRevenue);
router.get('/barber-stats', controller.getBarberStats)

// Usuarios
router.get('/users',          controller.getAllUsers);
router.patch('/users/:id',    controller.toggleUserStatus);

// Crear barbero
router.post('/barbers',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio'),
    body('email')
      .trim()
      .notEmpty().withMessage('El correo es obligatorio')
      .isEmail().withMessage('Correo inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('La contraseña es obligatoria')
      .isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  ],
  controller.createBarber
);

// Citas
router.get('/appointments',   controller.getAllAppointments);
// Servicios
const serviceValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio'),
  body('price')
    .notEmpty().withMessage('El precio es obligatorio')
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('duration_minutes')
    .notEmpty().withMessage('La duración es obligatoria')
    .isInt({ min: 1 }).withMessage('La duración debe ser mayor a 0'),
];

router.get('/services',            controller.getServices);
router.post('/services',           serviceValidation, controller.createService);
router.put('/services/:id',        serviceValidation, controller.updateService);
router.delete('/services/:id',     controller.deleteService);

module.exports = router;