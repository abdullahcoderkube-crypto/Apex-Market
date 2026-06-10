import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addProduct, getProducts } from '../utils/api';
import './Home.css';

const CATEGORIES = [
  { id: 'd5f748d1-b4a5-4a1c-b314-83a0d88015c1', label: 'Electronics & Gadgets' },
  { id: '691529e7-1861-410b-8dba-6fbaded9ba26', label: 'Fashion & Apparel' },
  { id: 'b6522a3f-20ab-428e-a764-5d47c8d45500', label: 'Home & Kitchen' },
];

const INITIAL_FORM = {
  productName: '',
  categoryId: '',
  productDescription: '',
  productPrice: '',
  productStock: '',
  imageFile: null,
};

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Customer marketplace states
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch products function
  const fetchProducts = async (categoryVal, sortVal, pageVal) => {
    try {
      setProductsLoading(true);
      setProductsError('');
      
      let response;
      if (!categoryVal) {
        // Light weight GET api/products (without any query parameters)
        response = await getProducts();
      } else {
        // Specific Category with or without Sort Filter, paginated
        const params = {
          category: categoryVal,
          page: pageVal,
          limit: 10,
        };
        if (sortVal) {
          params.sortBy = sortVal;
        }
        response = await getProducts(params);
      }

      if (response) {
        if (categoryVal) {
          setProducts(response.products || []);
          setTotalPages(Math.ceil((response.metadata?.totalItems || 0) / 10));
          setCurrentPage(parseInt(response.metadata?.currentPage || pageVal));
        } else {
          setProducts(response.products || []);
          setTotalPages(1);
          setCurrentPage(1);
        }
      }
    } catch (err) {
      console.error(err);
      setProductsError(err.message || 'Failed to load products.');
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchProducts(selectedCategory, sortBy, currentPage);
    }
  }, [user, user?.role]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchProducts(selectedCategory, sortBy, newPage);
  };

  if (!user) {
    return (
      <div className="center-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const isVendor = user.role === 'vendor';
  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData(prev => ({ ...prev, imageFile: file }));
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    if (formError) setFormError('');
  };

  const handleOpenModal = () => {
    setFormData(INITIAL_FORM);
    setImagePreview(null);
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
  };

  const validateForm = () => {
    const { productName, categoryId, productDescription, productPrice, productStock, imageFile } = formData;
    if (!productName.trim()) return 'Product name is required.';
    if (!categoryId) return 'Please select a category.';
    if (!productDescription.trim()) return 'Product description is required.';
    if (!productPrice || isNaN(productPrice) || Number(productPrice) <= 0) return 'Please enter a valid price.';
    if (!productStock || isNaN(productStock) || !Number.isInteger(Number(productStock)) || Number(productStock) < 0)
      return 'Please enter a valid stock quantity (whole number).';
    if (!imageFile) return 'Please upload a product image.';
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(imageFile.type)) return 'Image must be JPEG, PNG, or WebP.';
    if (imageFile.size > 5 * 1024 * 1024) return 'Image must be smaller than 5 MB.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) { setFormError(error); return; }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const data = new FormData();
      data.append('productName', formData.productName.trim());
      data.append('categoryId', formData.categoryId);
      data.append('productDescription', formData.productDescription.trim());
      data.append('productPrice', formData.productPrice);
      data.append('productStock', formData.productStock);
      data.append('imageFile', formData.imageFile);

      await addProduct(data);

      setFormSuccess('🎉 Product listed successfully!');
      setFormData(INITIAL_FORM);
      setImagePreview(null);
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 1800);
    } catch (err) {
      setFormError(err.message || 'Failed to add product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="brand">ApexMarket</div>
        <div className="user-nav-info">
          <div className="user-tag">
            <div className="user-avatar">{userInitials}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
              <span className={`role-badge ${isVendor ? 'vendor' : 'customer'}`}>
                {user.role}
              </span>
            </div>
          </div>
          {user.roles && user.roles.length > 1 && (
            <button
              onClick={() => navigate('/role-selection')}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Switch Role
            </button>
          )}
          {!isVendor && (
            <>
              <button
                onClick={() => navigate('/orders')}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginLeft: '0.5rem' }}
              >
                📦 My Orders
              </button>
              <button
                onClick={() => navigate('/checkout')}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginRight: '0.5rem', marginLeft: '0.5rem' }}
              >
                🛒 My Cart
              </button>
            </>
          )}
          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Dashboard Area */}
      <main className="dashboard-content">
        <div className="welcome-banner">
          <h1 className="welcome-title">Hello, {user.name}!</h1>
          <p className="welcome-subtitle">
            Welcome back to ApexMarket. Here is an overview of your activity.
          </p>
        </div>

        {isVendor ? (
          /* ── Vendor Dashboard ──────────────────────────────────────── */
          <>
            <div className="metrics-grid">
              <div className="dashboard-card glass-panel">
                <div className="card-icon">💰</div>
                <div className="card-title">Total Revenue</div>
                <div className="card-value">$12,450.00</div>
                <div className="card-trend up">▲ +12.4% vs last week</div>
              </div>
              <div className="dashboard-card glass-panel">
                <div className="card-icon">📦</div>
                <div className="card-title">Products Sold</div>
                <div className="card-value">342</div>
                <div className="card-trend up">▲ +8.2% vs last week</div>
              </div>
              <div className="dashboard-card glass-panel">
                <div className="card-icon">🏷️</div>
                <div className="card-title">Active Listings</div>
                <div className="card-value">18</div>
                <div className="card-trend neutral">● No change</div>
              </div>
            </div>

            <div className="showcase-section">
              <h3>Vendor Console</h3>
              <p className="showcase-text">
                Your store is live. Start listing new products, managing inventory, or responding to customer queries.
              </p>
              <div className="action-bar">
                <button className="btn btn-primary" onClick={handleOpenModal} id="add-product-btn">
                  + Add New Product
                </button>
                <button className="btn btn-secondary">View Inventory</button>
              </div>
            </div>
          </>
        ) : (
          /* ── Customer Dashboard ─────────────────────────────────────── */
          <>
            {/* Controls Bar: Category dropdown and price filters */}
            <div className="marketplace-controls-wrapper">
              <div className="form-group category-dropdown-group">
                <label className="form-label" htmlFor="marketplaceCategory">Category</label>
                <select
                  id="marketplaceCategory"
                  name="marketplaceCategory"
                  className="form-input form-select category-select"
                  value={selectedCategory}
                  onChange={(e) => {
                    const categoryId = e.target.value;
                    setSelectedCategory(categoryId);
                    setCurrentPage(1);
                    fetchProducts(categoryId, sortBy, 1);
                  }}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-buttons-group">
                <span className="filter-label">Sort by Price</span>
                <div className="sort-buttons">
                  <button
                    onClick={() => {
                      if (!selectedCategory) return;
                      const newSort = sortBy === 'price_asc' ? '' : 'price_asc';
                      setSortBy(newSort);
                      setCurrentPage(1);
                      fetchProducts(selectedCategory, newSort, 1);
                    }}
                    className={`btn btn-secondary sort-btn ${sortBy === 'price_asc' ? 'active' : ''} ${!selectedCategory ? 'disabled' : ''}`}
                    disabled={!selectedCategory}
                    title={!selectedCategory ? "Select a category first to sort" : "Sort lowest to highest"}
                  >
                    Lowest Price
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedCategory) return;
                      const newSort = sortBy === 'price_desc' ? '' : 'price_desc';
                      setSortBy(newSort);
                      setCurrentPage(1);
                      fetchProducts(selectedCategory, newSort, 1);
                    }}
                    className={`btn btn-secondary sort-btn ${sortBy === 'price_desc' ? 'active' : ''} ${!selectedCategory ? 'disabled' : ''}`}
                    disabled={!selectedCategory}
                    title={!selectedCategory ? "Select a category first to sort" : "Sort highest to lowest"}
                  >
                    Highest Price
                  </button>
                </div>
              </div>
            </div>

            {/* Error state */}
            {productsError && (
              <div className="alert alert-error" role="alert" style={{ marginTop: '1rem' }}>
                {productsError}
              </div>
            )}

            {/* Product Grid */}
            <div className="marketplace-products-section">
              {productsLoading ? (
                <div className="products-loading-wrapper">
                  <div className="spinner"></div>
                  <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="empty-state glass-panel">
                  <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                  <h3>No products found</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Try changing your category filter or check back later.</p>
                </div>
              ) : (
                <div className="products-grid">
                  {products.map((product) => {
                    const categoryObj = CATEGORIES.find(c => c.id === product.categoryId);
                    const categoryLabel = categoryObj ? categoryObj.label : 'Product';
                    const displayImage = product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
                    return (
                      <div
                        key={product.id}
                        className="product-card glass-panel"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <div className="product-card-image-wrapper">
                          <img
                            src={displayImage}
                            alt={product.name}
                            className="product-card-image"
                          />
                        </div>
                        <div className="product-card-info">
                          <span className={`category-badge cat-${product.categoryId}`}>
                            {categoryLabel}
                          </span>
                          <h4 className="product-card-title">{product.name}</h4>
                          <div className="product-card-price">
                            ${parseFloat(product.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Controls — only shown if category is selected */}
            {selectedCategory && totalPages > 1 && (
              <div className="pagination-bar">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || productsLoading}
                  className="btn btn-secondary pagination-btn"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || productsLoading}
                  className="btn btn-secondary pagination-btn"
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Add Product Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="modal-title">List a New Product</h2>
                <p className="modal-subtitle">Fill in the details to add your product to the marketplace.</p>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close modal" disabled={submitting}>
                ✕
              </button>
            </div>

            {/* Alerts */}
            {formError && <div className="alert alert-error" role="alert">{formError}</div>}
            {formSuccess && <div className="alert alert-success" role="status">{formSuccess}</div>}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="product-form">
              {/* Row 1: Name + Category */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="productName">Product Name</label>
                  <input
                    id="productName"
                    name="productName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                    value={formData.productName}
                    onChange={handleInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="categoryId">Category</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    className="form-input form-select"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    disabled={submitting}
                    required
                  >
                    <option value="">— Select a category —</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="productDescription">Description</label>
                <textarea
                  id="productDescription"
                  name="productDescription"
                  className="form-input form-textarea"
                  placeholder="Describe your product: key features, materials, dimensions…"
                  value={formData.productDescription}
                  onChange={handleInputChange}
                  disabled={submitting}
                  rows={4}
                  required
                />
              </div>

              {/* Row 2: Price + Stock */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="productPrice">Price (USD $)</label>
                  <input
                    id="productPrice"
                    name="productPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.productPrice}
                    onChange={handleInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="productStock">Stock Quantity</label>
                  <input
                    id="productStock"
                    name="productStock"
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="0"
                    value={formData.productStock}
                    onChange={handleInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label className="form-label" htmlFor="imageFile">Product Image</label>
                <label htmlFor="imageFile" className={`image-upload-zone ${imagePreview ? 'has-image' : ''} ${submitting ? 'disabled' : ''}`}>
                  {imagePreview ? (
                    <div className="image-preview-wrapper">
                      <img src={imagePreview} alt="Product preview" className="image-preview" />
                      <span className="image-change-hint">Click to change</span>
                    </div>
                  ) : (
                    <div className="image-upload-placeholder">
                      <span className="upload-icon">📸</span>
                      <span className="upload-label">Click to upload image</span>
                      <span className="upload-hint">JPEG, PNG, WebP — max 5 MB</span>
                    </div>
                  )}
                  <input
                    id="imageFile"
                    name="imageFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    disabled={submitting}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} id="submit-product-btn">
                  {submitting ? <span className="spinner" /> : 'List Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
