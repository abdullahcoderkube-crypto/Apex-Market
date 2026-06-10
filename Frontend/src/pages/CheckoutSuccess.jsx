import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CheckoutSuccess.css';

export default function CheckoutSuccess() {
  const navigate = useNavigate();

  return (
    <div className="center-container success-page-bg">
      <div className="success-card glass-panel">
        <div className="success-icon-wrapper">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12L9 17L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="success-icon-glow"></div>
        </div>

        <h1 className="success-title">Order Placed Successfully!</h1>
        <p className="success-subtitle">
          Thank you for your purchase. Your payment was verified, and your order is now being processed.
        </p>

        <div className="order-details-summary">
          <div className="details-row">
            <span>Status</span>
            <span className="badge-paid">Paid / Confirmed</span>
          </div>
          <div className="details-row">
            <span>Delivery</span>
            <span>Standard Shipping (3-5 business days)</span>
          </div>
        </div>

        <button onClick={() => navigate('/')} className="btn btn-primary continue-btn">
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
