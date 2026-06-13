import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { checkoutOrder } from '../utils/api';
import './StockConflict.css';

export default function StockConflict() {
  const location = useLocation();
  const navigate = useNavigate();

  const { outOfStockItems = [], formData = {}, cartItems = [] } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Identify out-of-stock IDs
  const outOfStockIds = new Set(outOfStockItems.map(item => item.id || item.productId));

  // Partition original cart items into available and unavailable lists
  const availableItems = cartItems.filter(item => {
    const id = item.id || item.productId;
    return !outOfStockIds.has(id);
  });

  const unavailableDisplayItems = cartItems.filter(item => {
    const id = item.id || item.productId;
    return outOfStockIds.has(id);
  });

  // Calculate new total amount based on available items
  const newTotalAmount = availableItems.reduce(
    (acc, item) => acc + parseFloat(item.price) * item.quantity,
    0
  );

  const handleProceed = async () => {
    if (availableItems.length === 0) {
      setError('No items are available to purchase.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create updated order data payload with available items only
      const updatedOrderData = {
        ...formData,
        totalAmount: newTotalAmount,
        items: availableItems.map(item => ({
          productId: item.id || item.productId,
          productName: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };

      // Call checkout order api
      const response = await checkoutOrder(updatedOrderData);

      // Clean/update local storage cart since user proceeded with a partial cart
      // We clear the cart completely on order initiation success
      localStorage.removeItem('cart');

      if (formData.paymentMethod === 'Stripe' && response?.url) {
        window.location.href = response.url;
      } else {
        navigate('/checkout/success');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Keep only the available items in the localStorage cart for user convenience
    if (availableItems.length > 0) {
      localStorage.setItem('cart', JSON.stringify(availableItems));
    } else {
      localStorage.removeItem('cart');
    }
    navigate('/');
  };

  if (!cartItems.length) {
    return (
      <div className="center-container">
        <div className="conflict-card glass-panel" style={{ textAlign: 'center' }}>
          <h2>Invalid Checkout Session</h2>
          <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>We could not load your cart conflict details.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conflict-page">
      <nav className="navbar">
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>ApexMarket</div>
        <button onClick={handleCancel} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Cancel & Back to Shop
        </button>
      </nav>

      <main className="conflict-container">
        <div className="conflict-card glass-panel">
          <div className="warning-banner">
            <span className="warning-badge">Stock Limit Conflict</span>
            <h1 className="conflict-title">Some products aren't available right now</h1>
            <p className="conflict-description">
              Due to stock updates, some items in your cart cannot be purchased. Would you like to proceed with the available items below?
            </p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="split-items-section">
            {/* Out of Stock Section */}
            {unavailableDisplayItems.length > 0 && (
              <div className="item-group unavailable-group">
                <h3 className="group-title text-red">Unavailable Items (Will be Removed)</h3>
                <div className="conflict-items-list">
                  {unavailableDisplayItems.map((item, idx) => (
                    <div key={idx} className="conflict-item opacity-70">
                      <img
                        src={(item.image_urls && item.image_urls.length > 0) ? item.image_urls[0] : (item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80')}
                        alt={item.name}
                        className="conflict-item-img border-red"
                      />
                      <div className="conflict-item-info">
                        <h4>{item.name}</h4>
                        <span className="unavailable-reason">Out of Stock</span>
                      </div>
                      <div className="conflict-item-price">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Section */}
            <div className="item-group available-group">
              <h3 className="group-title text-green">Available Items (Will be Purchased)</h3>
              <div className="conflict-items-list">
                {availableItems.length > 0 ? (
                  availableItems.map((item, idx) => (
                    <div key={idx} className="conflict-item">
                      <img
                        src={(item.image_urls && item.image_urls.length > 0) ? item.image_urls[0] : (item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80')}
                        alt={item.name}
                        className="conflict-item-img border-green"
                      />
                      <div className="conflict-item-info">
                        <h4>{item.name}</h4>
                        <span className="available-badge">Qty: {item.quantity}</span>
                      </div>
                      <div className="conflict-item-price">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-items-placeholder">No items in your order are currently available.</p>
                )}
              </div>
            </div>
          </div>

          <div className="conflict-summary-footer">
            <div className="total-recalculation">
              <div className="recalculation-row opacity-60">
                <span>Original Total:</span>
                <span>
                  $
                  {cartItems
                    .reduce((acc, item) => acc + parseFloat(item.price) * item.quantity, 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className="recalculation-row new-total">
                <span>Recalculated Total:</span>
                <span>${newTotalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="conflict-actions">
              <button
                onClick={handleProceed}
                disabled={loading || availableItems.length === 0}
                className="btn btn-primary proceed-btn"
              >
                {loading ? <span className="spinner"></span> : 'Proceed with Available Items'}
              </button>
              <button onClick={handleCancel} className="btn btn-secondary cancel-btn">
                Modify Cart / Back to Shop
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
