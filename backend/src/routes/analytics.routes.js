const express = require('express');
const getAnalytics = require('../controllers/analytics.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const router = express.Router()

router.get('/orders', authMiddleware, getAnalytics);
module.exports = router;