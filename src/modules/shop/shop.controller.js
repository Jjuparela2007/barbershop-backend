const shopService = require('./shop.service')
const res_        = require('../../utils/response')

async function getProducts(req, res) {
  try {
    const products = await shopService.getProducts({ category: req.query.category })
    return res_.ok(res, { products })
  } catch (err) { return res_.serverError(res, err) }
}

async function getProductById(req, res) {
  try {
    const product = await shopService.getProductById(req.params.id)
    return res_.ok(res, { product })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

async function createProduct(req, res) {
  try {
    const product = await shopService.createProduct(req.body)
    return res_.created(res, { product })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

async function updateProduct(req, res) {
  try {
    const product = await shopService.updateProduct(req.params.id, req.body)
    return res_.ok(res, { product })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

async function createOrder(req, res) {
  try {
    const { items, notes } = req.body
    const order = await shopService.createOrder(req.user.id, items, notes)
    return res_.created(res, { order })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

async function getMyOrders(req, res) {
  try {
    const orders = await shopService.getMyOrders(req.user.id)
    return res_.ok(res, { orders })
  } catch (err) { return res_.serverError(res, err) }
}

async function getOrderById(req, res) {
  try {
    const order = await shopService.getOrderById(req.params.id)
    return res_.ok(res, { order })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

async function getAllOrders(req, res) {
  try {
    const orders = await shopService.getAllOrders()
    return res_.ok(res, { orders })
  } catch (err) { return res_.serverError(res, err) }
}

async function updateOrderStatus(req, res) {
  try {
    const order = await shopService.updateOrderStatus(req.params.id, req.body.status)
    return res_.ok(res, { order })
  } catch (err) {
    if (err.status) return res_.error(res, err.message, err.status)
    return res_.serverError(res, err)
  }
}

module.exports = { getProducts, getProductById, createProduct, updateProduct, createOrder, getMyOrders, getOrderById, getAllOrders, updateOrderStatus }