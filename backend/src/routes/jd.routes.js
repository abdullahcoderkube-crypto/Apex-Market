const express = require('express');
const { getPickupAddresses, getServiceability, getWeights } = require('../services/jdApiService');
const authMiddleware = require('../middlewares/auth.middleware');
const router = express.Router();

/**
 * GET /api/jd/pickup-addresses
 * Proxies JD pickup address list to the frontend.
 */
router.get('/pickup-addresses', authMiddleware, async (req, res) => {
    try {
        const response = await getPickupAddresses();
        res.status(200).json(response);
    } catch (err) {
        console.error('[JD Route] pickup-addresses error:', err.message);
        res.status(500).json({ error: err.message || 'Failed to fetch pickup addresses' });
    }
});

/**
 * POST /api/jd/serviceability
 * Proxies courier serviceability check to JD API.
 *
 * Expected body:
 *   { pickup_pincode, destination_pincode, weight, payment_mode, declared_value }
 */
router.post('/serviceability', authMiddleware, async (req, res) => {
    try {
        const { pickup_pincode, destination_pincode, weight, payment_mode, declared_value } = req.body;

        if (!pickup_pincode || !destination_pincode || !weight || !payment_mode) {
            return res.status(400).json({
                error: 'pickup_pincode, destination_pincode, weight, and payment_mode are required'
            });
        }

        const payload = {
            pickup_pincode: String(pickup_pincode),
            destination_pincode: String(destination_pincode),
            weight: Number(weight),       // in grams as per JD API spec
            payment_mode: payment_mode,   // "COD" or "Prepaid"
        };

        if (declared_value !== undefined) {
            payload.declared_value = Number(declared_value);
        }

        const response = await getServiceability(payload);
        console.log('[JD] Serviceability response:', JSON.stringify(response?.data?.[0], null, 2));
        res.status(200).json(response);
    } catch (err) {
        console.error('[JD Route] serviceability error:', err.message);
        res.status(500).json({ error: err.message || 'Failed to check serviceability' });
    }
});

/**
 * GET /api/jd/weights
 * Proxies the JD WebnShip weight categories to the frontend.
 */
router.get('/weights', authMiddleware, async (req, res) => {
    try {
        const response = await getWeights();
        res.status(200).json(response);
    } catch (err) {
        console.error('[JD Route] weights error:', err.message);
        res.status(500).json({ error: err.message || 'Failed to fetch weight options' });
    }
});

module.exports = router;
