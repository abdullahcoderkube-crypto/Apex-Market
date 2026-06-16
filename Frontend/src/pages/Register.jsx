import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, requestOtp } from '../utils/api';
import './Register.css';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer', // default role
    storeName: '',
    businessAddress: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // OTP Verification States
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleRoleSelect = (roleValue) => {
    if (loading) return;
    setFormData((prev) => ({ ...prev, role: roleValue }));
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword, role, storeName, businessAddress, phoneNumber } = formData;
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return false;
    }
    
    if (name.length < 2) {
      setError('Name must be at least 2 characters long.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    // Conditional Validation for Vendors
    if (role === 'vendor') {
      if (!storeName || !businessAddress || !phoneNumber) {
        setError('Please fill in all vendor business details.');
        return false;
      }
      if (storeName.trim().length < 2) {
        setError('Store Name must be at least 2 characters long.');
        return false;
      }
      const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
      if (!phoneRegex.test(phoneNumber)) {
        setError('Please enter a valid phone number.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    // Prepare payload dynamically
    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    };

    if (formData.role === 'vendor') {
      payload.storeName = formData.storeName;
      payload.businessAddress = formData.businessAddress;
      payload.phoneNumber = formData.phoneNumber;
    }

    try {
      // First request OTP from backend
      const result = await requestOtp(payload);
      console.log('OTP Request Response:', result);
      setSuccess(`YOUR OTP is sent on ${formData.email}`);
      setShowOtpScreen(true);
      setOtpError('');
    } catch (err) {
      console.error('OTP request error:', err);
      setError(err.message || 'Failed to send OTP code. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerifyAndSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length === 0) {
      setOtpError('Please enter the verification code.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    setError('');
    setSuccess('');

    // Prepare register payload
    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      otpCode: otpCode.trim(),
    };

    if (formData.role === 'vendor') {
      payload.storeName = formData.storeName;
      payload.businessAddress = formData.businessAddress;
      payload.phoneNumber = formData.phoneNumber;
    }

    try {
      const result = await registerUser(payload);
      console.log('Registration Response:', result);
      setSuccess('Account created successfully! Redirecting to login...');
      setOtpError('');
      
      // Close OTP screen and navigate to login
      setTimeout(() => {
        setShowOtpScreen(false);
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Registration verification error:', err);
      setOtpError(err.message || 'Verification failed. Incorrect or expired OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    setSuccess('');
    
    // Prepare payload dynamically
    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    };

    if (formData.role === 'vendor') {
      payload.storeName = formData.storeName;
      payload.businessAddress = formData.businessAddress;
      payload.phoneNumber = formData.phoneNumber;
    }

    try {
      await requestOtp(payload);
      setSuccess(`YOUR OTP is sent on ${formData.email}`);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="center-container">
      <div className="register-card glass-panel">
        <div className="register-header">
          <h1 className="register-title">Create Account</h1>
          <p className="register-subtitle">Sign up to buy or sell products</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">I want to register as a:</label>
            <div className="role-cards">
              <div
                className={`role-card ${formData.role === 'customer' ? 'selected' : ''}`}
                onClick={() => handleRoleSelect('customer')}
              >
                <div className="role-title">Customer</div>
                <div className="role-desc">Browse and buy items</div>
              </div>
              <div
                className={`role-card ${formData.role === 'vendor' ? 'selected' : ''}`}
                onClick={() => handleRoleSelect('vendor')}
              >
                <div className="role-title">Vendor</div>
                <div className="role-desc">List and sell products</div>
              </div>
            </div>
          </div>

          {/* Conditional Vendor Registration Fields */}
          {formData.role === 'vendor' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="storeName">
                  Store Name
                </label>
                <input
                  id="storeName"
                  name="storeName"
                  type="text"
                  placeholder="Apex Superstore"
                  value={formData.storeName}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="businessAddress">
                  Business Address
                </label>
                <input
                  id="businessAddress"
                  name="businessAddress"
                  type="text"
                  placeholder="123 Commerce St, New York, NY"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phoneNumber">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+1 (555) 019-2834"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-input"
                  required
                />
              </div>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                className="form-input"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? <span className="spinner"></span> : 'Register'}
          </button>
        </form>

        <div className="register-footer">
          Already have an account?
          <Link to="/login" className="register-link">
            Sign In
          </Link>
        </div>
      </div>

      {/* ── OTP Verification Modal ─────────────────────────────────────────── */}
      {showOtpScreen && (
        <div className="otp-modal-overlay" onClick={() => !otpLoading && setShowOtpScreen(false)} role="dialog" aria-modal="true" aria-labelledby="otp-modal-title">
          <div className="otp-modal-panel glass-panel" onClick={e => e.stopPropagation()}>
            <div className="otp-modal-header">
              <div>
                <h2 className="otp-modal-title" id="otp-modal-title">Verification Code</h2>
                <p className="otp-modal-subtitle">Enter the 6-digit OTP code to verify your identity.</p>
              </div>
              <button className="otp-modal-close-btn" onClick={() => setShowOtpScreen(false)} aria-label="Close modal" disabled={otpLoading}>
                ✕
              </button>
            </div>

            <div className="otp-modal-body">
              <div className="otp-message-alert">
                <span className="otp-alert-icon">✉️</span>
                <span className="otp-alert-text">YOUR OTP is sent on <strong>{formData.email}</strong></span>
              </div>

              {otpError && <div className="alert alert-error" role="alert">{otpError}</div>}
              {success && <div className="alert alert-success" role="status">{success}</div>}

              <form onSubmit={handleOtpVerifyAndSubmit} className="otp-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="otpCodeInput">OTP Code</label>
                  <input
                    id="otpCodeInput"
                    name="otpCode"
                    type="text"
                    pattern="[0-9]*"
                    maxLength="6"
                    className="form-input otp-code-input"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={otpLoading}
                    required
                    autoFocus
                  />
                </div>

                <div className="otp-modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowOtpScreen(false)} disabled={otpLoading}>
                    Go Back
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleResendOtp} disabled={otpLoading}>
                    Resend OTP
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={otpLoading} id="verify-otp-btn">
                    {otpLoading ? <span className="spinner" /> : 'Verify & Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
