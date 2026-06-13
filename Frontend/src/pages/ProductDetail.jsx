import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../utils/api';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        setError('');
        const response = await getProductById(id);
        if (response && response.success && response.product) {
          setProduct(response.product);
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

  const handleAddToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const prodId = product.id || id;
    const existing = cart.find(item => (item.id || item.productId) === prodId);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, id: prodId, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    
    setActionMessage(`🎉 ${product.name} added to cart!`);
    setMessageType('success');
    setTimeout(() => {
      setActionMessage('');
    }, 3000);
  };

  const handleBuyNow = () => {
    const prodId = product.id || id;
    navigate('/checkout', { state: { product: { ...product, id: prodId, quantity: 1 } } });
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

  const { name, description, price, imageUrl, image_urls } = product;

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
            <div className="product-header">
              <h1 className="product-title">{name}</h1>
              <div className="product-price-tag">${parseFloat(price).toFixed(2)}</div>
            </div>

            <div className="product-divider"></div>

            <div className="product-description-section">
              <h3>About this product</h3>
              <p className="product-description">{description}</p>
            </div>

            <div className="product-stock-status">
              <span className="status-dot available"></span>
              <span>In Stock & Ready to Ship</span>
            </div>

            <div className="product-actions">
              <button 
                onClick={handleAddToCart} 
                className="btn btn-secondary btn-action"
              >
                🛒 Add to Cart
              </button>
              <button 
                onClick={handleBuyNow} 
                className="btn btn-primary btn-action"
              >
                ⚡ Buy Now
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
