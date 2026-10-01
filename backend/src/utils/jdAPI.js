const crypto = require('crypto-js');

/**
 * Generate HMAC-SHA256 signature for JD WebnShip API.
 * IMPORTANT: rawBodyString must be the EXACT JSON string that will be sent
 * in the request body. Stringify the payload object BEFORE calling this,
 * and pass that same string to Axios as `config.data`.
 *
 * @param {string} rawBodyString - The JSON.stringify()'d request body
 * @param {string} productListingKey - The secret key from JD Retailer dashboard
 * @returns {string} - The HMAC-SHA256 hex signature
 */
const generateHmacSignature = (rawBodyString, productListingKey) => {
    const hash = crypto.HmacSHA256(rawBodyString, productListingKey);
    return crypto.enc.Hex.stringify(hash);
};

module.exports = {
    generateHmacSignature
};
