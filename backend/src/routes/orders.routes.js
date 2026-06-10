const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {getAllOrders, getOrderById} = require('../controllers/orders.controller');
const router = express.Router();

router.get('/', authMiddleware, getAllOrders);
router.get('/:id', authMiddleware, getOrderById)
module.exports = router;