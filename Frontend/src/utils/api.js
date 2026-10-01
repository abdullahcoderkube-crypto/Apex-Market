const API_BASE_URL = process.env.NODE_ENV === 'production' ? "http://74.208.194.227" : "http://localhost:3000"

let accessToken = '';

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Helper to handle fetch responses and extract JSON or error messages.
 */
async function handleResponse(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    }
    // If backend returns an error message, use that, otherwise default
    const errorMsg = (data && data.message) || data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    return Promise.reject(err);
  }

  return data;
}

/**
 * Register a new user (customer or vendor)
 * @param {Object} userData - { name, email, password, role }
 */
export async function registerUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
}

/**
 * Request an email verification OTP code
 * @param {Object} userData - Registration payload { name, email, password, role, ... }
 */
export async function requestOtp(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
}

/**
 * Log in an existing user
 * @param {Object} credentials - { email, password }
 */
export async function loginUser(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });
  return handleResponse(response);
}

/**
 * Fetch a new access token using the HttpOnly refresh token cookie
 */
export async function refreshAccessToken() {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  return handleResponse(response);
}

/**
 * Revoke session and log out the user on backend
 */
export async function logoutUser() {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  return handleResponse(response);
}

/**
 * Decodes the payload of a JWT token client-side without external dependencies.
 * @param {string} token - The JWT token to decode.
 * @returns {Object|null} The decoded token payload, or null if invalid.
 */
export function decodeToken(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Add a new product (vendor only). Sends multipart/form-data.
 * @param {FormData} formData - FormData containing productName, categoryId,
 *   productDescription, productPrice, productStock, and imageFile.
 * @returns {Promise<Object>} The created product details.
 */
export async function addProduct(formData) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/vendor/products/add`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // NOTE: Do NOT set Content-Type here — browser sets it automatically
      // with the correct multipart boundary when using FormData.
    },
    body: formData,
  });
  return handleResponse(response);
}

/**
 * Fetch products, optionally filtered, sorted, and paginated
 * @param {Object} [params] - Optional parameters { category, sortBy, page, limit }
 */
export async function getProducts(params = {}) {
  const token = getAccessToken();
  const url = new URL(`${API_BASE_URL}/api/products`);
  
  if (params.category) url.searchParams.append('category', params.category);
  if (params.sortBy) url.searchParams.append('sortBy', params.sortBy);
  if (params.page) url.searchParams.append('page', params.page);
  if (params.limit) url.searchParams.append('limit', params.limit);
  if (params.query) url.searchParams.append('query', params.query);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Fetch a single product by ID
 * @param {string} id - Product ID
 */
export async function getProductById(id) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Checkout order
 * @param {Object} orderData
 */
export async function checkoutOrder(orderData) {
  const token = getAccessToken();
  const decoded = decodeToken(token);
  const userId = decoded?.userId;
  
  const payload = {
    ...orderData,
    userId: userId
  };
  const response = await fetch(`${API_BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

/**
 * Fetch all orders for the logged-in customer based on their JWT token
 */
export async function getOrders() {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Fetch detailed information for a single order by ID
 * @param {string} id - Order ID
 */
export async function getOrderById(id) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Fetch all orders that the logged-in vendor needs to process
 */
export async function getVendorOrders() {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/vendor/orders`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Fetch all inventory products for the logged-in vendor
 */
export async function getVendorInventory() {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/vendor/products`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Update a vendor product (name, description, price, stock, and/or imageFile)
 * @param {FormData} formData
 */
export async function updateVendorProduct(formData) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/vendor/products/update`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      // NOTE: Do NOT set Content-Type here — browser sets it automatically
      // with the correct multipart boundary when using FormData.
    },
    body: formData,
  });
  return handleResponse(response);
}

/**
 * Remove or restore a product
 * @param {string} productId 
 * @param {boolean} isActive 
 * @param {number} [stock] 
 */
export async function removeOrRestoreVendorProduct(productId, isActive, stock) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/vendor/products/remove`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId, isActive, stock }),
  });
  return handleResponse(response);
}

/**
 * Update the status of a vendor order by ID via PATCH
 * @param {string} orderId 
 */
export async function updateVendorOrderStatus(orderId) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/vendor/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Submit a rating and review for a specific product
 * @param {string} productId 
 * @param {Object} reviewData - { productRating: number, reviewComment: string }
 */
export async function submitProductReview(productId, reviewData) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/reviews/product/${productId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reviewData),
  });
  return handleResponse(response);
}

/**
 * Add a product to the user's wishlist
 * @param {string} productId
 */
export async function addWishlistItem(productId) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/wishlist/add/${productId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Remove a product from the user's wishlist
 * @param {string} productId
 */
export async function removeWishlistItem(productId) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/wishlist/remove/${productId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Get all wishlisted products for the user
 */
export async function getWishlist() {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Apply coupon code to receive discount details
 * @param {Object} couponData - { couponCode: string, cartTotal: number }
 */
export async function applyCouponCode(couponData) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/coupons/apply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(couponData),
  });
  return handleResponse(response);
}

/**
 * Fetch current user profile
 */
export async function getUserProfile() {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

/**
 * Update user profile details (Name, Phone, Avatar). Sends multipart/form-data.
 * @param {FormData} formData
 */
export async function updateUserProfile(formData) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/profile/update`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  return handleResponse(response);
}

/**
 * Change user password
 * @param {Object} passwordData - { currentPassword, newPassword, confirmPassword }
 */
export async function changeUserPassword(passwordData) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/profile/change-password`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(passwordData),
  });
  return handleResponse(response);
}

/**
 * Get JD Pickup Addresses
 */
export async function getJDPickupAddresses() {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/jd/pickup-addresses`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  return handleResponse(response);
}

/**
 * Check JD courier serviceability for a route.
 * @param {Object} data
 * @param {string} data.pickup_pincode
 * @param {string} data.destination_pincode
 * @param {number} data.weight              - Weight in GRAMS
 * @param {string} data.payment_mode        - "COD" or "Prepaid"
 * @param {number} [data.declared_value]
 */
export async function getJDServiceability(data) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/jd/serviceability`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
}



