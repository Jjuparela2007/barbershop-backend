const { Router } = require('express');
const { body }   = require('express-validator');
const controller = require('./appointments.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');

const router = Router();

// Pública — consultar disponibilidad
router.get('/availability', controller.getAvailability);

// Privadas — cliente
router.post('/',
  authenticate,
  authorize('client'),
  [
    body('barber_id')
      .notEmpty().withMessage('El barbero es obligatorio')
      .isInt().withMessage('barber_id inválido'),
    body('service_id')
      .notEmpty().withMessage('El servicio es obligatorio')
      .isInt().withMessage('service_id inválido'),
    body('appointment_date')
      .notEmpty().withMessage('La fecha es obligatoria')
      .isDate().withMessage('Formato de fecha inválido (YYYY-MM-DD)'),
    body('start_time')
      .notEmpty().withMessage('La hora es obligatoria'),
  ],
  controller.create
);

router.get('/my', authenticate, controller.getMine);

// Barbero ve sus citas (solo citas normales, excluye walk-in)
router.get('/barber/:id',
  authenticate,
  authorize('admin', 'barber'),
  controller.getByBarber
);

// Ver cita específica
router.get('/:id', authenticate, controller.getById);

// Cambiar estado (admin y barbero confirman/completan, cliente cancela)
router.patch('/:id/status',
  authenticate,
  authorize('admin', 'barber', 'client'),
  [
    body('status')
      .notEmpty().withMessage('El estado es obligatorio')
      .isIn(['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
      .withMessage('Estado inválido'),
  ],
  controller.updateStatus
);

// Venta directa walk-in
router.post('/walk-in',
  authenticate,
  authorize('barber', 'admin'),
  [
    body('service_id').notEmpty().isInt().withMessage('Servicio obligatorio'),
    body('client_name').trim().notEmpty().withMessage('Nombre del cliente obligatorio'),
  ],
  controller.createWalkIn
);

// 👇 NUEVA RUTA: Obtener solo ventas walk-in de un barbero
router.get('/walk-in/:barberId',
  authenticate,
  authorize('barber', 'admin'),
  controller.getWalkInSales
);

module.exports = router;