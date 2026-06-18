import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById, getWishlist, addWishlistItem, removeWishlistItem } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        setError('');
        const response = await getProductById(id);
        if (response && response.success && response.product) {
          setProduct(response.product);
          setAvgRating(response.avgRating || 0);
          setReviews(response.product.reviews || []);
          setActiveImageIndex(0);
        } else {
          setError('Product not found.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch product details.');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    async function checkWishlist() {
      if (user && user.role === 'customer') {
        try {
          const res = await getWishlist();
          const items = res?.wishlist || [];
          const exists = items.some(item => (item.id || item.productId) === id);
          setIsWishlisted(exists);
        } catch (err) {
          console.error('Failed to fetch wishlist status:', err);
        }
      }
    }
    checkWishlist();
  }, [user, id]);

  const handleWishlistToggle = async () => {
    if (!user) {
      alert("Please log in to add products to your wishlist.");
      return;
    }
    try {
      if (isWishlisted) {
        await removeWishlistItem(id);
        setIsWishlisted(false);
      } else {
        await addWishlistItem(id);
        setIsWishlisted(true);
      }
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
      alert(err.message || 'Something went wrong.');
    }
  };

  const [cartQuantity, setCartQuantity] = useState(0);

  useEffect(() => {
    if (product) {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const prodId = product.id || id;
      const existing = cart.find(item => (item.id || item.productId) === prodId);
      setCartQuantity(existing ? existing.quantity : 0);
    }
  }, [product, id]);

  const updateCartQuantity = (newQty) => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const prodId = product.id || id;
    const existingIndex = cart.findIndex(item => (item.id || item.productId) === prodId);

    if (newQty <= 0) {
      if (existingIndex > -1) {
        cart.splice(existingIndex, 1);
      }
      setCartQuantity(0);
    } else {
      if (existingIndex > -1) {
        cart[existingIndex].quantity = newQty;
      } else {
        cart.push({ ...product, id: prodId, quantity: newQty });
      }
      setCartQuantity(newQty);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
  };

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      setActionMessage(`⚠️ This product is out of stock.`);
      setMessageType('error');
      setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    updateCartQuantity(1);
    setActionMessage(`🎉 ${product.name} added to cart!`);
    setMessageType('success');
    setTimeout(() => {
      setActionMessage('');
    }, 3000);
  };

  const handleIncreaseQty = () => {
    if (cartQuantity >= product.stock) {
      setActionMessage(`⚠️ Only ${product.stock} items available in stock.`);
      setMessageType('error');
      setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    updateCartQuantity(cartQuantity + 1);
  };

  const handleDecreaseQty = () => {
    updateCartQuantity(cartQuantity - 1);
  };

  const handleBuyNow = () => {
    const prodId = product.id || id;
    const buyQty = cartQuantity > 0 ? cartQuantity : 1;
    navigate('/checkout', { state: { product: { ...product, id: prodId, quantity: buyQty } } });
  };

  if (loading) {
    return (
      <div className="center-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-container">
        <button onClick={() => navigate('/')} className="back-link">
          ← Back to Products
        </button>
        <div className="alert alert-error" style={{ marginTop: '2rem' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-container">
        <button onClick={() => navigate('/')} className="back-link">
          ← Back to Products
        </button>
        <div className="alert alert-error" style={{ marginTop: '2rem' }}>
          Product not found.
        </div>
      </div>
    );
  }

  const { name, description, price, imageUrl, image_urls, stock } = product;

  // Placeholder images
  const images = (image_urls && image_urls.length > 0)
    ? image_urls
    : (imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80']);

  return (
    <div className="product-detail-page">
      <nav className="navbar">
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>ApexMarket</div>
        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Back to Shop
        </button>
      </nav>

      <main className="product-detail-container">
        <button onClick={() => navigate('/')} className="back-link">
          ← Back to Products
        </button>

        {actionMessage && (
          <div className={`alert alert-${messageType} floating-alert`}>
            {actionMessage}
          </div>
        )}

        <div className="product-detail-grid glass-panel">
          {/* Left: Product Image Gallery */}
          <div className="product-detail-gallery">
            <div className="product-detail-image-wrapper">
              <img src={images[activeImageIndex] || images[0]} alt={name} className="product-detail-image" />
            </div>
            
            {images.length > 1 && (
              <div className="gallery-thumbnails">
                {images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`gallery-thumbnail-container ${idx === activeImageIndex ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={img} alt={`${name} ${idx + 1}`} className="gallery-thumbnail-img" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Details */}
          <div className="product-detail-info">
            <div className="product-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flexGrow: 1 }}>
                <h1 className="product-title">{name}</h1>
                
                {reviews.length > 0 ? (
                  <div className="product-rating-summary">
                    <span className="star-rating-stars">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <span key={idx} className={`star-icon ${idx < Math.round(avgRating) ? 'filled' : ''}`}>★</span>
                      ))}
                    </span>
                    <span className="rating-value" style={{ marginLeft: '0.25rem' }}>{avgRating}</span>
                    <span className="reviews-count" style={{ marginLeft: '0.25rem' }}>({reviews.length} customer review{reviews.length > 1 ? 's' : ''})</span>
                  </div>
                ) : (
                  <div className="product-rating-summary no-rating">
                    <span>No reviews yet</span>
                  </div>
                )}

                <div className="product-price-tag">${parseFloat(price).toFixed(2)}</div>
              </div>
              {user && user.role === 'customer' && (
                <button 
                  className={`detail-wishlist-btn ${isWishlisted ? 'active' : ''}`}
                  onClick={handleWishlistToggle}
                  aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  {isWishlisted ? '❤️' : '🤍'}
                </button>
              )}
            </div>

            <div className="product-divider"></div>

            <div className="product-description-section">
              <h3>About this product</h3>
              <p className="product-description">{description}</p>
            </div>

            <div className="product-stock-status">
              {stock > 0 ? (
                <>
                  <span className="status-dot available"></span>
                  <span>In Stock & Ready to Ship</span>
                </>
              ) : (
                <>
                  <span className="status-dot" style={{ backgroundColor: '#ef4444' }}></span>
                  <span style={{ color: '#ef4444', fontWeight: '500' }}>Product Out of Stock, New Stock will arrive soon!</span>
                </>
              )}
            </div>

            <div className="product-actions">
              {cartQuantity > 0 ? (
                <div className="quantity-selector">
                  <button 
                    onClick={handleDecreaseQty} 
                    className="btn-qty btn-minus" 
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="qty-counter">{cartQuantity}</span>
                  <button 
                    onClick={handleIncreaseQty} 
                    className="btn-qty btn-plus" 
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleAddToCart} 
                  className="btn btn-secondary btn-action"
                  disabled={stock <= 0}
                >
                  🛒 Add to Cart
                </button>
              )}
              <button 
                onClick={handleBuyNow} 
                className="btn btn-primary btn-action"
                disabled={stock <= 0}
              >
                ⚡ Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="product-reviews-section glass-panel" style={{ marginTop: '2.5rem', padding: '2.5rem' }}>
          <h2 className="reviews-section-title">Customer Reviews</h2>
          
          {reviews.length === 0 ? (
            <div className="no-reviews-state">
              <span className="no-reviews-icon">💬</span>
              <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>No reviews written for this product yet.</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>Be the first to buy and leave your feedback!</p>
            </div>
          ) : (
            <div className="reviews-display-grid">
              {/* Rating Overview */}
              <div className="rating-overview-card">
                <div className="big-rating-number">{avgRating}</div>
                <div className="stars-wrapper">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span key={idx} className={`star-icon-big ${idx < Math.round(avgRating) ? 'filled' : ''}`}>★</span>
                  ))}
                </div>
                <p className="overview-count">Based on {reviews.length} review{reviews.length > 1 ? 's' : ''}</p>
              </div>

              {/* Individual reviews list */}
              <div className="reviews-list">
                {reviews.map((rev) => {
                  const reviewerName = rev.user?.name || 'Anonymous';
                  const formattedDate = new Date(rev.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div key={rev.id} className="review-comment-card">
                      <div className="review-comment-header">
                        <span className="reviewer-name">{reviewerName}</span>
                        <span className="review-comment-date">{formattedDate}</span>
                      </div>
                      <div className="review-comment-stars">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <span key={idx} className={`star-icon-comment ${idx < rev.rating ? 'filled' : ''}`}>★</span>
                        ))}
                      </div>
                      <p className="reviewer-text">{rev.comment}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
