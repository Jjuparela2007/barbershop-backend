const { Router } = require('express');
const { body }   = require('express-validator');
const controller = require('./barbers.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');

const router = Router();

// Rutas públicas
router.get('/',    controller.getAll);
router.get('/:id', controller.getById);
router.get('/:id/schedule', controller.getSchedule);

// Actualizar horario (admin o el mismo barbero)
router.put('/:id/schedule',
  authenticate,
  authorize('admin', 'barber'),
  [
    body('schedules')
      .isArray().withMessage('schedules debe ser un arreglo'),
    body('schedules.*.day_of_week')
      .isInt({ min: 1, max: 7 }).withMessage('day_of_week debe ser entre 1 y 7'),
    body('schedules.*.start_time')
      .notEmpty().withMessage('start_time es obligatorio'),
    body('schedules.*.end_time')
      .notEmpty().withMessage('end_time es obligatorio'),
  ],
  controller.updateSchedule
);

// Agregar bloqueo de tiempo (admin o el mismo barbero)
router.post('/:id/blocked-times',
  authenticate,
  authorize('admin', 'barber'),
  [
    body('blocked_date')
      .notEmpty().withMessage('La fecha es obligatoria')
      .isDate().withMessage('Formato de fecha inválido (YYYY-MM-DD)'),
  ],
  controller.addBlockedTime
);
// Galería (pública)
router.get('/:id/gallery', controller.getGallery)

// Agregar imagen (admin o el mismo barbero)
router.post('/:id/gallery',
  authenticate,
  authorize('admin', 'barber'),
  controller.addGalleryImage
)

// Eliminar imagen (admin o el mismo barbero)
router.delete('/:id/gallery/:imageId',
  authenticate,
  authorize('admin', 'barber'),
  controller.deleteGalleryImage
)

module.exports = router;