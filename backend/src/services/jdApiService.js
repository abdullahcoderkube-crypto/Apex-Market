const axios = require('axios');
const { generateHmacSignature } = require('../utils/jdAPI');

const JD_BASE_URL = process.env.JD_BASE_URL || 'https://planning-native-once-race.trycloudflare.com';

// ─── In-memory token store ────────────────────────────────────────────────────
let _activeToken = null;
let _isRefreshing = false;
let _refreshSubscribers = []; // queue of callbacks waiting for the new token

const getToken = () => {
    if (!_activeToken) _activeToken = process.env.JD_BEARER_TOKEN;
    return _activeToken;
};

const onTokenRefreshed = (newToken) => {
    _refreshSubscribers.forEach(cb => cb(newToken));
    _refreshSubscribers = [];
};

const addRefreshSubscriber = (cb) => {
    _refreshSubscribers.push(cb);
};

// ─── Token refresh ────────────────────────────────────────────────────────────
const refreshToken = async () => {
    const email    = process.env.JD_EMAIL;
    const password = process.env.JD_PASSWORD;
    const productKey = process.env.PRODUCT_LISTING_KEY;

    if (!email || !password) {
        throw new Error('JD_EMAIL and JD_PASSWORD must be set in .env for auto token refresh');
    }

    console.log('[JD] Token expired – fetching a new one via POST /api/auth/token ...');

    // The auth endpoint also requires HMAC signature on the request body
    const body       = JSON.stringify({ email, password });
    const signature  = generateHmacSignature(body, productKey);

    const response = await axios.post(
        `${JD_BASE_URL}/api/auth/token`,
        body,
        {
            headers: {
                'Content-Type':   'application/json',
                'Accept':         'application/json',
                'X-JD-Signature': signature,
            }
        }
    );

    const newToken =
        response.data?.data?.access_token ||
        response.data?.data?.token        ||
        response.data?.token              ||
        response.data?.access_token;

    if (!newToken) {
        throw new Error('[JD] Token refresh: could not extract access_token from response: ' + JSON.stringify(response.data));
    }

    _activeToken = newToken;
    console.log('[JD] Token refreshed successfully.');
    return newToken;
};

// ─── Axios instance with interceptor ─────────────────────────────────────────
const jdAxios = axios.create({
    baseURL: `${JD_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
    }
});

/**
 * Request interceptor – attaches Bearer token + HMAC signature before every request.
 */
jdAxios.interceptors.request.use((config) => {
    const token      = getToken();
    const productKey = process.env.PRODUCT_LISTING_KEY;

    if (!token || !productKey) {
        return Promise.reject(new Error('JD API credentials missing from .env'));
    }

    config.headers['Authorization'] = `Bearer ${token}`;

    // Sign: POST/PATCH/PUT → sign body string; GET/DELETE → sign empty string
    const hasBody  = config.data !== undefined && config.data !== null;
    const bodyStr  = hasBody ? (typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : '';
    config.headers['X-JD-Signature'] = generateHmacSignature(bodyStr, productKey);

    // Ensure body is sent as a string so the signed content matches exactly
    if (hasBody && typeof config.data !== 'string') {
        config.data = JSON.stringify(config.data);
    }

    return config;
});

/**
 * Response interceptor – on 401, refresh the token once and replay queued requests.
 */
jdAxios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
            const errDetail = error.response?.data || error.message;
            console.error('[JD] API Error:', errDetail);
            throw new Error(
                typeof errDetail === 'object'
                    ? (errDetail.message || JSON.stringify(errDetail))
                    : errDetail
            );
        }

        console.warn('[JD] Received 401 – interceptor queuing refresh...');
        originalRequest._retry = true;

        if (_isRefreshing) {
            // Another request already started a refresh — queue this one
            return new Promise((resolve, reject) => {
                addRefreshSubscriber((newToken) => {
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    resolve(jdAxios(originalRequest));
                });
            });
        }

        _isRefreshing = true;
        try {
            const newToken = await refreshToken();
            _isRefreshing  = false;
            onTokenRefreshed(newToken);

            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return jdAxios(originalRequest);
        } catch (refreshError) {
            _isRefreshing = false;
            _refreshSubscribers = [];
            console.error('[JD] Token refresh failed:', refreshError.message);
            throw refreshError;
        }
    }
);

// ─── Public API helpers ───────────────────────────────────────────────────────

const jdApiRequest = async (method, endpoint, data = null) => {
    const config = { method: method.toUpperCase(), url: endpoint };
    if (data !== null) config.data = data;
    const response = await jdAxios(config);
    return response.data;
};

const getPickupAddresses = async () =>
    jdApiRequest('GET', '/pickup-addresses');

const getWeights = async () =>
    jdApiRequest('GET', '/weights');

const getServiceability = async (params) =>
    jdApiRequest('POST', '/couriers/serviceability', params);

const createShipment = async (shipmentData) =>
    jdApiRequest('POST', '/shipments', shipmentData);

module.exports = {
    jdApiRequest,
    getPickupAddresses,
    getWeights,
    getServiceability,
    createShipment,
};


