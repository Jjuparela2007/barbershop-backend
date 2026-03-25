const { Router }       = require('express')
const controller       = require('./shop.controller')
const { authenticate } = require('../../middlewares/auth.middleware')
const { authorize }    = require('../../middlewares/role.middleware')

const router = Router()

// Públicas
router.get('/products',         controller.getProducts)
router.get('/products/:id',     controller.getProductById)

// Cliente
router.post('/orders',          authenticate, authorize('client'), controller.createOrder)
router.get('/orders/my',        authenticate, controller.getMyOrders)
router.get('/orders/:id',       authenticate, controller.getOrderById)

// Admin
router.post('/products',        authenticate, authorize('admin'), controller.createProduct)
router.put('/products/:id',     authenticate, authorize('admin'), controller.updateProduct)
router.get('/orders',           authenticate, authorize('admin'), controller.getAllOrders)
router.patch('/orders/:id/status', authenticate, authorize('admin'), controller.updateOrderStatus)

module.exports = router