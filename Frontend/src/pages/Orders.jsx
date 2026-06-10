import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrders, getOrderById } from '../utils/api';
import './Orders.css';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Order Detail states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Fetch all orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getOrders();
      // Handle both raw array and { orders: [...] } response formats safely
      const ordersList = Array.isArray(response) ? response : (response?.orders || []);
      setOrders(ordersList);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(err.message || 'Failed to fetch order history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Fetch individual order detail
  const handleOrderClick = async (orderId) => {
    try {
      setDetailLoading(true);
      setDetailError('');
      setSelectedOrder(null);
      
      const response = await getOrderById(orderId);
      const orderData = response && response.order ? response.order : response;
      setSelectedOrder(orderData);
    } catch (err) {
      console.error('Failed to load order detail:', err);
      setDetailError(err.message || 'Failed to load order details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper to format date like "10 June 2026"
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Helper to format price to Dollars (USD)
  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Helper to render shortened order ID
  const formatOrderId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    // return abstract pattern like 434hkh345sfd
    return id.substring(0, 8) + id.substring(id.length - 4);
  };

  // Helper to format payment method dynamically
  const getPaymentMethodLabel = (method) => {
    if (!method) return 'Stripe';
    if (method === 'COD') return 'COD';
    return method;
  };

  return (
    <div className="orders-page">
      <nav className="navbar">
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          ApexMarket
        </div>
        <div className="nav-actions">
          <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="orders-container">
        <div className="orders-header-section">
          <h1 className="orders-page-title">My Order History</h1>
          <p className="orders-page-subtitle">View and track your previous purchases</p>
        </div>

        {loading ? (
          <div className="orders-loading-state">
            <div className="spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error" role="alert" style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <span>⚠️</span> {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-orders-state glass-panel">
            <div className="empty-icon">📦</div>
            <h2>No Orders Found</h2>
            <p>You haven't placed any orders yet. Head to the store to make your first purchase.</p>
            <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Browse Products
            </button>
          </div>
        ) : (
          <div className="orders-list" id="orders-list-container">
            {orders.map((order) => {
              const abstractId = formatOrderId(order.id);
              const formattedDate = formatDate(order.createdAt || order.date);
              const isPaid = (order.status || '').toLowerCase() === 'paid';
              const isCancelled = (order.status || '').toLowerCase() === 'cancelled';
              
              return (
                <div
                  key={order.id}
                  className="order-row-card glass-panel"
                  onClick={() => handleOrderClick(order.id)}
                  title="Click to view details"
                >
                  <div className="order-row-main">
                    <div className="order-id-col">
                      <span className="order-icon-badge">📦</span>
                      <span className="order-id-label">Order {abstractId}</span>
                    </div>

                    <div className="order-amount-col">
                      <span className="order-amount-label">Amount - {formatPrice(order.totalAmount)}</span>
                    </div>

                    <div className="order-status-col">
                      <span className={`order-status-badge ${isPaid ? 'paid' : isCancelled ? 'cancelled' : 'unpaid'}`}>
                        {order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Unpaid'}
                      </span>
                    </div>

                    <div className="order-date-col">
                      <span className="order-date-label">{formattedDate}</span>
                    </div>
                  </div>
                  <div className="order-row-chevron">❯</div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Loading Spinner Overlay */}
      {detailLoading && (
        <div className="detail-modal-overlay">
          <div className="detail-loading-panel glass-panel">
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem' }}>Fetching order details...</p>
          </div>
        </div>
      )}

      {/* Detail Error Dialog */}
      {detailError && (
        <div className="detail-modal-overlay" onClick={() => setDetailError('')}>
          <div className="detail-error-panel glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="alert alert-error" role="alert">
              <span>⚠️</span> {detailError}
            </div>
            <button onClick={() => setDetailError('')} className="btn btn-secondary" style={{ width: '100%' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Modal / Side Drawer */}
      {selectedOrder && (
        <div className="detail-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="detail-modal-panel glass-panel" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="detail-modal-header">
              <div>
                <h2 className="detail-modal-title">Order Details</h2>
                <p className="detail-modal-subtitle">ID: {selectedOrder.id}</p>
              </div>
              <button className="detail-modal-close" onClick={() => setSelectedOrder(null)} aria-label="Close details">
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="detail-modal-body">
              {/* Order Meta Cards */}
              <div className="detail-meta-grid">
                <div className="detail-meta-card">
                  <span className="meta-label">Status</span>
                  <span className={`order-status-badge ${(selectedOrder.status || '').toLowerCase() === 'paid' ? 'paid' : (selectedOrder.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'unpaid'}`}>
                    {selectedOrder.status ? (selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)) : 'Unpaid'}
                  </span>
                </div>
                <div className="detail-meta-card">
                  <span className="meta-label">Date Placed</span>
                  <span className="meta-value">{formatDate(selectedOrder.createdAt)}</span>
                </div>
                <div className="detail-meta-card">
                  <span className="meta-label">Total Amount</span>
                  <span className="meta-value total-price">{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
                <div className="detail-meta-card">
                  <span className="meta-label">Payment Method</span>
                  <span className="meta-value">{getPaymentMethodLabel(selectedOrder.payment_method)}</span>
                </div>
              </div>

              {/* Delivery Address */}
              {selectedOrder.address && (
                <div className="detail-section address-section">
                  <h3 className="detail-section-title">Shipping Address</h3>
                  <div className="address-card">
                    <p className="address-name">{selectedOrder.address.fullName}</p>
                    <p className="address-line">{selectedOrder.address.addressLine1}</p>
                    <p className="address-city">
                      {selectedOrder.address.city}, {selectedOrder.address.state} {selectedOrder.address.postalCode}
                    </p>
                    {selectedOrder.address.phone && (
                      <p className="address-phone">📞 {selectedOrder.address.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="detail-section items-section">
                <h3 className="detail-section-title">Order Items</h3>
                <div className="detail-items-list">
                  {selectedOrder.items && selectedOrder.items.map((item, idx) => {
                    const itemName = item.productName || item.product?.name || 'Product';
                    const itemImage = item.imageUrl || item.product?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80';
                    return (
                      <div key={idx} className="detail-item-card">
                        <img
                          src={itemImage}
                          alt={itemName}
                          className="detail-item-image"
                        />
                        <div className="detail-item-info">
                          <h4 className="detail-item-name">{itemName}</h4>
                          <div className="detail-item-pricing">
                            <span>{formatPrice(item.price)} × {item.quantity}</span>
                            <span className="detail-item-subtotal">
                              {formatPrice(parseFloat(item.price) * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="detail-modal-footer">
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary btn-block">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
