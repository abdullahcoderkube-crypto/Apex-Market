import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            <button onClick={() => navigate('/role-selection')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginRight: '0.5rem' }}>
              Switch Role
            </button>
          )}
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
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
          /* Vendor Dashboard */
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
                Your store backend configuration is set up. You can start listing new products, checking inventory levels, or responding to customer queries here.
              </p>
              <div className="action-bar">
                <button className="btn btn-primary">Add New Product</button>
                <button className="btn btn-secondary">View Inventory</button>
              </div>
            </div>
          </>
        ) : (
          /* Customer Dashboard */
          <>
            <div className="metrics-grid">
              <div className="dashboard-card glass-panel">
                <div className="card-icon">🛍️</div>
                <div className="card-title">Active Orders</div>
                <div className="card-value">2</div>
                <div className="card-trend up">In transit</div>
              </div>
              <div className="dashboard-card glass-panel">
                <div className="card-icon">💳</div>
                <div className="card-title">Wallet Balance</div>
                <div className="card-value">$150.00</div>
                <div className="card-trend neutral">● Available funds</div>
              </div>
              <div className="dashboard-card glass-panel">
                <div className="card-icon">❤️</div>
                <div className="card-title">Wishlist Items</div>
                <div className="card-value">12</div>
                <div className="card-trend neutral">Ready to checkout</div>
              </div>
            </div>

            <div className="showcase-section">
              <h3>Discover Products</h3>
              <p className="showcase-text">
                Explore thousands of products listed by verified vendors. From electronics to fashion, find everything you need.
              </p>
              <div className="action-bar">
                <button className="btn btn-primary">Browse Marketplace</button>
                <button className="btn btn-secondary">Track Orders</button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
