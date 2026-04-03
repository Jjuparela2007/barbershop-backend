const { Router } = require('express');
const { body }   = require('express-validator');
const controller = require('./services.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');
const { createUploader } = require('../../utils/upload');

const upload = createUploader('services');

const router = Router();

const serviceValidations = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('Nombre demasiado largo'),

  body('duration_minutes')
    .notEmpty().withMessage('La duración es obligatoria')
    .isInt({ min: 5, max: 480 }).withMessage('Duración debe ser entre 5 y 480 minutos'),

  body('price')
    .notEmpty().withMessage('El precio es obligatorio')
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
];

// Rutas públicas
router.get('/',    controller.getAll);
router.get('/:id', controller.getById);

// Rutas privadas (solo admin)
router.post(  '/',          authenticate, authorize('admin'), serviceValidations, controller.create);
router.put(   '/:id',       authenticate, authorize('admin'), serviceValidations, controller.update);
router.delete('/:id',       authenticate, authorize('admin'), controller.remove);
router.post(  '/:id/image', authenticate, authorize('admin'), upload.single('image'), controller.uploadServiceImage);

module.exports = router;