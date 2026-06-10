import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkoutOrder } from '../utils/api';
import './Checkout.css';

const INITIAL_FORM = {
  fullName: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  phoneNumber: '',
  paymentMethod: 'COD'
};

export default function Checkout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Check if we arrived via "Buy Now" with a single product in state
    if (location.state && location.state.product) {
      setCartItems([location.state.product]);
    } else {
      // Otherwise, load from localStorage
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      setCartItems(cart);
    }
  }, [location]);

  const handleRemoveItem = (itemId) => {
    const updatedCart = cartItems.filter(item => (item.id || item.productId) !== itemId);
    setCartItems(updatedCart);
    if (!location.state || !location.state.product) {
      localStorage.setItem('cart', JSON.stringify(updatedCart));
    }
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentToggle = (method) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cartItems.length) {
      setError('Your cart is empty.');
      return;
    }

    // Basic validation
    if (!formData.fullName || !formData.address || !formData.city || !formData.state || !formData.postalCode || !formData.phoneNumber) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Clean payload: Unifies single checkout and cart checkout into one array format
      const orderData = {
        ...formData,
        userId: user?.id,
        totalAmount: totalAmount,
        items: cartItems.map(item => ({
          productId: item.id || item.productId, // Handle both id schemas safely
          productName: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const response = await checkoutOrder(orderData);
      
      // Clear cart on success
      localStorage.removeItem('cart');
      
      if (formData.paymentMethod === 'Stripe' && response?.url) {
        window.location.href = response.url;
      } else {
        navigate('/checkout/success');
      }

    } catch (err) {
      console.error(err);
      if (err.status === 409) {
        navigate('/checkout/stock-conflict', {
          state: {
            outOfStockItems: err.data?.outOfStockItems || [],
            formData,
            cartItems
          }
        });
      } else {
        setError(err.message || 'Checkout failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!cartItems.length && !successMessage) {
    return (
      <div className="checkout-container empty-cart glass-panel">
        <h2>Your Cart is Empty</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <nav className="navbar">
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>ApexMarket</div>
        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Back to Shop
        </button>
      </nav>

      <main className="checkout-container">
        {successMessage ? (
          <div className="alert alert-success" style={{ textAlign: 'center', padding: '2rem' }}>
            <h2>{successMessage}</h2>
            <p>Redirecting you to the home page...</p>
          </div>
        ) : (
          <div className="checkout-grid">
            {/* Left: Order Summary */}
            <div className="checkout-summary glass-panel">
              <h2 className="section-title">Order Summary</h2>
              <div className="cart-items-list">
                {cartItems.map((item, idx) => {
                  const itemId = item.id || item.productId;
                  return (
                    <div key={idx} className="cart-item">
                      <img src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'} alt={item.name} className="cart-item-img" />
                      <div className="cart-item-info">
                        <h4>{item.name}</h4>
                        <p>Qty: {item.quantity}</p>
                      </div>
                      <div className="cart-item-actions">
                        <div className="cart-item-price">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => handleRemoveItem(itemId)}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="checkout-divider"></div>
              <div className="checkout-total">
                <span>Total Amount:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Right: Checkout Form */}
            <div className="checkout-form-container glass-panel">
              <h2 className="section-title">Shipping & Payment</h2>
              
              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit} className="checkout-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="form-input" required disabled={loading} />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="form-input" required disabled={loading} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="form-input" required disabled={loading} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="form-input" required disabled={loading} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange} className="form-input" required disabled={loading} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="form-input" required disabled={loading} />
                  </div>
                </div>

                <div className="checkout-divider"></div>

                <h3 className="section-subtitle">Payment Method</h3>
                <div className="payment-toggle">
                  <button 
                    type="button" 
                    className={`btn ${formData.paymentMethod === 'COD' ? 'btn-primary' : 'btn-secondary'} toggle-btn`}
                    onClick={() => handlePaymentToggle('COD')}
                    disabled={loading}
                  >
                    Cash on Delivery
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${formData.paymentMethod === 'Stripe' ? 'btn-primary' : 'btn-secondary'} toggle-btn`}
                    onClick={() => handlePaymentToggle('Stripe')}
                    disabled={loading}
                  >
                    Stripe (Card)
                  </button>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary submit-btn"
                  disabled={loading}
                  style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}
                >
                  {loading ? <span className="spinner"></span> : `Proceed to Payment ($${totalAmount.toFixed(2)})`}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
