const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://apex-market-bchl.onrender.com': 'http://localhost:3000';

/**
 * Helper to handle fetch responses and extract JSON or error messages.
 */
async function handleResponse(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
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
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
  const url = new URL(`${API_BASE_URL}/api/products`);
  
  if (params.category) url.searchParams.append('category', params.category);
  if (params.sortBy) url.searchParams.append('sortBy', params.sortBy);
  if (params.page) url.searchParams.append('page', params.page);
  if (params.limit) url.searchParams.append('limit', params.limit);

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
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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


