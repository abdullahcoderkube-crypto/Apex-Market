import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addProduct, getProducts, getVendorOrders, getVendorInventory, updateVendorProduct, removeOrRestoreVendorProduct } from '../utils/api';
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
  imageFiles: [],
};

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Vendor orders states
  const [vendorOrders, setVendorOrders] = useState([]);
  const [vendorOrdersLoading, setVendorOrdersLoading] = useState(false);
  const [vendorOrdersError, setVendorOrdersError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders' | 'inventory'

  // Vendor inventory states
  const [vendorInventory, setVendorInventory] = useState([]);
  const [vendorInventoryLoading, setVendorInventoryLoading] = useState(false);
  const [vendorInventoryError, setVendorInventoryError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    productId: '',
    productName: '',
    categoryId: '',
    productDescription: '',
    productPrice: '',
    productStock: '',
    imageFiles: [],
  });
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [isReplacingImages, setIsReplacingImages] = useState(false);
  const [restoringProductId, setRestoringProductId] = useState(null);
  const [restoringStockValue, setRestoringStockValue] = useState('');
  const [actionLoading, setActionLoading] = useState(null);


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

  const fetchVendorOrders = async () => {
    try {
      setVendorOrdersLoading(true);
      setVendorOrdersError('');
      const response = await getVendorOrders();
      if (response && response.success) {
        setVendorOrders(response.orders || []);
      } else {
        setVendorOrders([]);
      }
    } catch (err) {
      console.error(err);
      setVendorOrdersError(err.message || 'Failed to load vendor orders.');
    } finally {
      setVendorOrdersLoading(false);
    }
  };

  const fetchVendorInventory = async () => {
    try {
      setVendorInventoryLoading(true);
      setVendorInventoryError('');
      const response = await getVendorInventory();
      if (response && response.success) {
        setVendorInventory(response.inventory || []);
      } else {
        setVendorInventory([]);
      }
    } catch (err) {
      console.error(err);
      setVendorInventoryError(err.message || 'Failed to load inventory.');
    } finally {
      setVendorInventoryLoading(false);
    }
  };

  // Product Edit Modal Handlers
  const handleEditProductClick = (product) => {
    setEditFormData({
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
      productDescription: product.description,
      productPrice: product.price.toString(),
      productStock: product.stock.toString(),
      imageFiles: [],
    });
    setEditImagePreviews(product.image_urls || (product.imageUrl ? [product.imageUrl] : []));
    setIsReplacingImages(false);
    setFormError('');
    setFormSuccess('');
    setShowEditModal(true);
    setRestoringProductId(null);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsReplacingImages(true);
    setEditFormData(prev => {
      const existing = prev.imageFiles || [];
      const newFiles = [...existing, ...files].slice(0, 5);
      const previews = newFiles.map(f => URL.createObjectURL(f));
      setEditImagePreviews(previews);
      return { ...prev, imageFiles: newFiles };
    });
    if (formError) setFormError('');
  };

  const handleRemoveEditImage = (index) => {
    setEditFormData(prev => {
      const newFiles = prev.imageFiles.filter((_, i) => i !== index);
      const previews = newFiles.map(f => URL.createObjectURL(f));
      setEditImagePreviews(previews);
      return { ...prev, imageFiles: newFiles };
    });
  };

  const validateEditForm = () => {
    const { productName, categoryId, productDescription, productPrice, productStock, imageFiles } = editFormData;
    if (!productName.trim()) return 'Product name is required.';
    if (!categoryId) return 'Please select a category.';
    if (!productDescription.trim()) return 'Product description is required.';
    if (!productPrice || isNaN(productPrice) || Number(productPrice) <= 0) return 'Please enter a valid price.';
    if (!productStock || isNaN(productStock) || !Number.isInteger(Number(productStock)) || Number(productStock) < 0)
      return 'Please enter a valid stock quantity (whole number).';
    if (imageFiles && imageFiles.length > 0) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      for (const file of imageFiles) {
        if (!allowed.includes(file.type)) return 'Each image must be JPEG, PNG, or WebP.';
        if (file.size > 5 * 1024 * 1024) return 'Each image must be smaller than 5 MB.';
      }
    }
    return null;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const error = validateEditForm();
    if (error) { setFormError(error); return; }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const data = new FormData();
      data.append('productId', editFormData.productId);
      data.append('name', editFormData.productName.trim());
      data.append('categoryId', editFormData.categoryId);
      data.append('description', editFormData.productDescription.trim());
      data.append('price', editFormData.productPrice);
      data.append('stock', editFormData.productStock);
      if (isReplacingImages && editFormData.imageFiles && editFormData.imageFiles.length > 0) {
        editFormData.imageFiles.forEach(file => {
          data.append('imageFiles', file);
        });
      }

      const res = await updateVendorProduct(data);
      if (res && res.success) {
        setFormSuccess('🎉 Product updated successfully!');
        setVendorInventory(prev => prev.map(p => p.id === editFormData.productId ? res.product : p));
        setTimeout(() => {
          setShowEditModal(false);
          setFormSuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to update product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Product Handler
  const handleRemoveProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to remove this product?")) {
      return;
    }
    try {
      setActionLoading(productId);
      const res = await removeOrRestoreVendorProduct(productId, false);
      if (res && res.success) {
        setVendorInventory(prev => prev.map(p => p.id === productId ? { ...p, isActive: false } : p));
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to remove product");
    } finally {
      setActionLoading(null);
    }
  };

  // Restore Product Handlers
  const handleRestoreClick = (product) => {
    setRestoringProductId(product.id);
    setRestoringStockValue('10'); // default initial stock
    setShowEditModal(false);
  };

  const handleRestoreSubmit = async (e, productId) => {
    e.preventDefault();
    if (!restoringStockValue.trim() || isNaN(restoringStockValue) || Number(restoringStockValue) < 0 || !Number.isInteger(Number(restoringStockValue))) {
      alert("Please enter a valid non-negative integer for stock.");
      return;
    }

    try {
      setActionLoading(productId);
      const res = await removeOrRestoreVendorProduct(productId, true, parseInt(restoringStockValue, 10));
      if (res && res.success) {
        setVendorInventory(prev => prev.map(p => p.id === productId ? { ...p, isActive: true, stock: res.product.stock } : p));
        setRestoringProductId(null);
        setRestoringStockValue('');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to restore product");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (user && user.role === 'vendor') {
      fetchVendorInventory(); // Load inventory on mount for metrics/list
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'vendor') {
      if (activeTab === 'orders') {
        fetchVendorOrders();
      } else if (activeTab === 'inventory') {
        fetchVendorInventory();
      }
    }
  }, [user, activeTab]);


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
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setFormData(prev => {
      const existing = prev.imageFiles || [];
      const newFiles = [...existing, ...files].slice(0, 5);
      const previews = newFiles.map(f => URL.createObjectURL(f));
      setImagePreviews(previews);
      return { ...prev, imageFiles: newFiles };
    });
    if (formError) setFormError('');
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => {
      const newFiles = prev.imageFiles.filter((_, i) => i !== index);
      const previews = newFiles.map(f => URL.createObjectURL(f));
      setImagePreviews(previews);
      return { ...prev, imageFiles: newFiles };
    });
  };

  const handleOpenModal = () => {
    setFormData(INITIAL_FORM);
    setImagePreviews([]);
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
  };

  const validateForm = () => {
    const { productName, categoryId, productDescription, productPrice, productStock, imageFiles } = formData;
    if (!productName.trim()) return 'Product name is required.';
    if (!categoryId) return 'Please select a category.';
    if (!productDescription.trim()) return 'Product description is required.';
    if (!productPrice || isNaN(productPrice) || Number(productPrice) <= 0) return 'Please enter a valid price.';
    if (!productStock || isNaN(productStock) || !Number.isInteger(Number(productStock)) || Number(productStock) < 0)
      return 'Please enter a valid stock quantity (whole number).';
    if (!imageFiles || imageFiles.length === 0) return 'Please upload at least one product image.';
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of imageFiles) {
      if (!allowed.includes(file.type)) return 'Each image must be JPEG, PNG, or WebP.';
      if (file.size > 5 * 1024 * 1024) return 'Each image must be smaller than 5 MB.';
    }
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
      formData.imageFiles.forEach(file => {
        data.append('imageFiles', file);
      });

      await addProduct(data);

      setFormSuccess('🎉 Product listed successfully!');
      setFormData(INITIAL_FORM);
      setImagePreviews([]);
      
      // Refresh vendor inventory
      fetchVendorInventory();

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
            {/* Vendor Navigation Tabs */}
            <div className="vendor-tabs">
              <button 
                className={`vendor-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📊 Overview
              </button>
              <button 
                className={`vendor-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
                id="vendor-inventory-tab"
              >
                📦 Inventory
              </button>
              <button 
                className={`vendor-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
                id="vendor-orders-tab"
              >
                📋 Orders to Process
              </button>
            </div>

            {activeTab === 'overview' ? (
              <>
                <div className="metrics-grid">
                  <div className="dashboard-card glass-panel" onClick={() => setActiveTab('orders')}>
                    <div className="card-icon">💰</div>
                    <div className="card-title">Total Revenue</div>
                    <div className="card-value">$12,450.00</div>
                    <div className="card-trend up">▲ +12.4% vs last week</div>
                  </div>
                  <div className="dashboard-card glass-panel" onClick={() => setActiveTab('orders')}>
                    <div className="card-icon">📦</div>
                    <div className="card-title">Products Sold</div>
                    <div className="card-value">342</div>
                    <div className="card-trend up">▲ +8.2% vs last week</div>
                  </div>
                  <div className="dashboard-card glass-panel" onClick={() => setActiveTab('inventory')} id="vendor-listings-card">
                    <div className="card-icon">🏷️</div>
                    <div className="card-title">Active Listings</div>
                    <div className="card-value">{vendorInventory.filter(p => p.isActive).length}</div>
                    <div className="card-trend neutral">● Manage products</div>
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
                    <button className="btn btn-secondary" onClick={() => setActiveTab('inventory')} id="view-inventory-btn">View Inventory</button>
                  </div>
                </div>
              </>
            ) : activeTab === 'inventory' ? (
              /* ── Vendor Inventory Tab ─────────────────────────────────── */
              <div className="vendor-inventory-section">
                <div className="section-header-row">
                  <h2>Product Inventory</h2>
                  <div className="action-buttons-header">
                    <button className="btn btn-primary btn-sm" onClick={handleOpenModal} id="add-product-btn-inv">
                      + Add New Product
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={fetchVendorInventory} disabled={vendorInventoryLoading} style={{ marginLeft: '0.5rem' }}>
                      {vendorInventoryLoading ? 'Refreshing...' : '🔄 Refresh Inventory'}
                    </button>
                  </div>
                </div>

                {vendorInventoryError && (
                  <div className="alert alert-error" role="alert">
                    {vendorInventoryError}
                  </div>
                )}

                {vendorInventoryLoading ? (
                  <div className="products-loading-wrapper" style={{ minHeight: '200px', position: 'relative' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading inventory...</p>
                  </div>
                ) : vendorInventory.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</div>
                    <h3>No products listed yet</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Click "+ Add New Product" to list your first item.</p>
                  </div>
                ) : (
                  <div className="vendor-inventory-grid">
                    {vendorInventory.map((product) => {
                      const categoryObj = CATEGORIES.find(c => c.id === product.categoryId);
                      const categoryLabel = categoryObj ? categoryObj.label : 'Product';
                      const displayImage = (product.image_urls && product.image_urls.length > 0) ? product.image_urls[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80');
                      
                      const isRestoring = restoringProductId === product.id;
                      const isLoading = actionLoading === product.id;

                      return (
                        <div key={product.id} className={`vendor-product-card glass-panel ${!product.isActive ? 'product-removed' : ''}`}>
                          <div className="vendor-product-image-wrapper">
                            <img src={displayImage} alt={product.name} className="vendor-product-image" />
                            {!product.isActive && (
                              <div className="removed-overlay">
                                <span>Removed</span>
                              </div>
                            )}
                          </div>

                          <div className="vendor-product-info">
                            <div className="badge-row">
                              <span className={`category-badge cat-${product.categoryId}`}>
                                {categoryLabel}
                              </span>
                              <span className={`status-badge ${product.isActive ? (product.stock > 0 ? 'status-paid' : 'status-unpaid') : 'status-cancelled'}`}>
                                {product.isActive ? (product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock') : 'Removed'}
                              </span>
                            </div>

                            <h4 className="vendor-product-name">{product.name}</h4>
                            <p className="vendor-product-desc">{product.description}</p>
                            
                            <div className="price-stock-row">
                              <span className="vendor-product-price">${parseFloat(product.price).toFixed(2)}</span>
                              <span className="vendor-product-stock-display">
                                Current Stock: <strong>{product.stock}</strong>
                              </span>
                            </div>

                            {/* Action Forms or Buttons */}
                            <div className="vendor-product-actions">
                              {isRestoring ? (
                                <form onSubmit={(e) => handleRestoreSubmit(e, product.id)} className="inline-action-form">
                                  <div className="input-group-inline">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      className="form-input form-input-sm"
                                      value={restoringStockValue}
                                      onChange={(e) => setRestoringStockValue(e.target.value)}
                                      disabled={isLoading}
                                      placeholder="Restore stock"
                                      autoFocus
                                      required
                                    />
                                    <button type="submit" className="btn btn-primary btn-xs" disabled={isLoading} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                      {isLoading ? '...' : 'Restore'}
                                    </button>
                                    <button type="button" className="btn btn-secondary btn-xs" onClick={() => setRestoringProductId(null)} disabled={isLoading}>
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="buttons-row">
                                  {product.isActive ? (
                                    <>
                                      <button 
                                        className="btn btn-secondary btn-sm" 
                                        onClick={() => handleEditProductClick(product)}
                                        disabled={isLoading}
                                      >
                                        Update Product
                                      </button>
                                      <button 
                                        className="btn btn-danger btn-sm" 
                                        onClick={() => handleRemoveProduct(product.id)}
                                        disabled={isLoading}
                                      >
                                        Remove Product
                                      </button>
                                    </>
                                  ) : (
                                    <button 
                                      className="btn btn-restore btn-sm" 
                                      onClick={() => handleRestoreClick(product)}
                                      disabled={isLoading}
                                    >
                                      Restore Product
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (

              /* ── Vendor Orders Tab ────────────────────────────────────── */
              <div className="vendor-orders-section">
                <div className="section-header-row">
                  <h2>Orders to Process</h2>
                  <button className="btn btn-secondary btn-sm" onClick={fetchVendorOrders} disabled={vendorOrdersLoading}>
                    {vendorOrdersLoading ? 'Refreshing...' : '🔄 Refresh Orders'}
                  </button>
                </div>

                {vendorOrdersError && (
                  <div className="alert alert-error" role="alert">
                    {vendorOrdersError}
                  </div>
                )}

                {vendorOrdersLoading ? (
                  <div className="products-loading-wrapper" style={{ minHeight: '200px', position: 'relative' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading orders...</p>
                  </div>
                ) : vendorOrders.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                    <h3>No orders to process</h3>
                    <p style={{ color: 'var(--text-muted)' }}>When customers buy your products, they will show up here.</p>
                  </div>
                ) : (
                  <div className="vendor-orders-list">
                    {vendorOrders.map((order) => {
                      const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={order.id} className="order-panel glass-panel">
                          {/* Order Summary Header */}
                          <div className="order-header-main">
                            <div className="order-meta-info">
                              <span className="order-id-badge">Order ID: {order.id.slice(0, 8)}...</span>
                              <span className="order-date-label">{orderDate}</span>
                            </div>
                            <div className="order-status-badge-container">
                              <span className={`status-badge status-${order.status}`}>
                                {order.status}
                              </span>
                              <span className="payment-method-badge">
                                {order.paymentMethod}
                              </span>
                            </div>
                          </div>

                          <div className="order-body-grid">
                            {/* Customer and Shipping details */}
                            <div className="customer-details-card">
                              <h5>Customer Details</h5>
                              <p className="cust-info">
                                <strong>Name:</strong> {order.customerName}<br />
                                <strong>Email:</strong> {order.customerEmail}
                              </p>

                              {order.shippingAddress && (
                                <div className="shipping-address-box">
                                  <h5>Shipping Address</h5>
                                  <p className="address-text">
                                    <strong>{order.shippingAddress.fullName}</strong><br />
                                    {order.shippingAddress.phone && <>Phone: {order.shippingAddress.phone}<br /></>}
                                    {order.shippingAddress.addressLine1}<br />
                                    {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}
                                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}<br />
                                    {order.shippingAddress.country}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Items details */}
                            <div className="items-list-card">
                              <h5>Items to Fulfill ({order.items.length})</h5>
                              <div className="order-items-grid">
                                {order.items.map((item) => (
                                  <div key={item.id} className="vendor-item-row">
                                    {item.imageUrl && (
                                      <img src={item.imageUrl} alt={item.name} className="item-thumbnail" />
                                    )}
                                    <div className="item-details">
                                      <span className="item-name">{item.name}</span>
                                      <span className="item-qty-price">
                                        Qty: <strong>{item.quantity}</strong> × ${item.price.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="item-row-total">
                                      ${item.total.toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="vendor-order-footer">
                                <span className="vendor-subtotal-label">Your Earnings:</span>
                                <span className="vendor-subtotal-value">${order.vendorSubtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
                    const displayImage = (product.image_urls && product.image_urls.length > 0) ? product.image_urls[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80');
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
                <label className="form-label">Product Images (Upload up to 5)</label>
                
                {imagePreviews.length > 0 && (
                  <div className="multi-image-preview-grid">
                    {imagePreviews.map((src, index) => (
                      <div key={index} className="preview-image-container">
                        <img src={src} alt={`Preview ${index + 1}`} className="preview-image-item" />
                        <button
                          type="button"
                          className="btn-remove-preview"
                          onClick={() => handleRemoveImage(index)}
                          title="Remove image"
                          disabled={submitting}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {imagePreviews.length < 5 && (
                  <label htmlFor="imageFile" className={`image-upload-zone ${submitting ? 'disabled' : ''}`}>
                    <div className="image-upload-placeholder">
                      <span className="upload-icon">📸</span>
                      <span className="upload-label">Click to select image(s)</span>
                      <span className="upload-hint">Upload up to {5 - imagePreviews.length} more (JPEG, PNG, WebP — max 5 MB each)</span>
                    </div>
                    <input
                      id="imageFile"
                      name="imageFiles"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      disabled={submitting}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
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

      {/* ── Edit Product Modal ─────────────────────────────────────────────── */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowEditModal(false)} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="edit-modal-title">Edit Product Details</h2>
                <p className="modal-subtitle">Modify the fields below to update your listed product.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)} aria-label="Close modal" disabled={submitting}>
                ✕
              </button>
            </div>

            {/* Alerts */}
            {formError && <div className="alert alert-error" role="alert">{formError}</div>}
            {formSuccess && <div className="alert alert-success" role="status">{formSuccess}</div>}

            {/* Form */}
            <form onSubmit={handleEditSubmit} noValidate className="product-form">
              {/* Row 1: Name + Category */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="editProductName">Product Name</label>
                  <input
                    id="editProductName"
                    name="productName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                    value={editFormData.productName}
                    onChange={handleEditInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editCategoryId">Category</label>
                  <select
                    id="editCategoryId"
                    name="categoryId"
                    className="form-input form-select"
                    value={editFormData.categoryId}
                    onChange={handleEditInputChange}
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
                <label className="form-label" htmlFor="editProductDescription">Description</label>
                <textarea
                  id="editProductDescription"
                  name="productDescription"
                  className="form-input form-textarea"
                  placeholder="Describe your product..."
                  value={editFormData.productDescription}
                  onChange={handleEditInputChange}
                  disabled={submitting}
                  rows={4}
                  required
                />
              </div>

              {/* Row 2: Price + Stock */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="editProductPrice">Price (USD $)</label>
                  <input
                    id="editProductPrice"
                    name="productPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={editFormData.productPrice}
                    onChange={handleEditInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editProductStock">Stock Quantity</label>
                  <input
                    id="editProductStock"
                    name="productStock"
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="0"
                    value={editFormData.productStock}
                    onChange={handleEditInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label className="form-label">Product Images (Upload up to 5)</label>
                
                {editImagePreviews.length > 0 && (
                  <div className="multi-image-preview-grid">
                    {editImagePreviews.map((src, index) => (
                      <div key={index} className="preview-image-container">
                        <img src={src} alt={`Preview ${index + 1}`} className="preview-image-item" />
                        {isReplacingImages && (
                          <button
                            type="button"
                            className="btn-remove-preview"
                            onClick={() => handleRemoveEditImage(index)}
                            title="Remove image"
                            disabled={submitting}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(!isReplacingImages && editImagePreviews.length > 0) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginBottom: '1rem', width: '100%' }}
                    onClick={() => {
                      setIsReplacingImages(true);
                      setEditImagePreviews([]);
                      setEditFormData(prev => ({ ...prev, imageFiles: [] }));
                    }}
                    disabled={submitting}
                  >
                    🔄 Replace Existing Images
                  </button>
                )}

                {(isReplacingImages || editImagePreviews.length === 0) && editImagePreviews.length < 5 && (
                  <label htmlFor="editImageFile" className={`image-upload-zone ${submitting ? 'disabled' : ''}`}>
                    <div className="image-upload-placeholder">
                      <span className="upload-icon">📸</span>
                      <span className="upload-label">Click to select new image(s)</span>
                      <span className="upload-hint">Upload up to {5 - editImagePreviews.length} more (JPEG, PNG, WebP — max 5 MB each)</span>
                    </div>
                    <input
                      id="editImageFile"
                      name="imageFiles"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleEditImageChange}
                      disabled={submitting}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} id="save-product-btn">
                  {submitting ? <span className="spinner" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
