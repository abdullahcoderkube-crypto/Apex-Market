import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CheckoutFailure.css';

export default function CheckoutFailure() {
  const navigate = useNavigate();

  return (
    <div className="center-container failure-page-bg">
      <div className="failure-card glass-panel">
        <div className="failure-icon-wrapper">
          <div className="failure-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="failure-icon-glow"></div>
        </div>

        <h1 className="failure-title">Payment Unsuccessful</h1>
        <p className="failure-subtitle">
          We encountered an issue while processing your payment transaction. Your card was not charged.
        </p>

        <div className="failure-advice">
          <h4>What you can do:</h4>
          <ul>
            <li>Check if your billing address and postal code are correct</li>
            <li>Ensure you have sufficient funds in your account</li>
            <li>Try another card or payment method</li>
          </ul>
        </div>

        <div className="failure-actions">
          <button onClick={() => navigate('/checkout')} className="btn btn-primary try-again-btn">
            Try Checkout Again
          </button>
          <button onClick={() => navigate('/')} className="btn btn-secondary back-shop-btn">
            Back to Shop
          </button>
        </div>
      </div>
    </div>
  );
}
