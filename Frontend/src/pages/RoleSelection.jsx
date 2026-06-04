import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './RoleSelection.css';

export default function RoleSelection() {
  const { user, selectActiveRole } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    selectActiveRole(role);
    navigate('/');
  };

  return (
    <div className="center-container">
      <div className="role-selection-card glass-panel">
        <div className="role-selection-header">
          <h1 className="role-selection-title">Select Workspace</h1>
          <p className="role-selection-subtitle">
            Choose the mode you want to switch to for this session.
          </p>
        </div>

        <div className="role-options">
          <button
            onClick={() => handleRoleSelect('customer')}
            className="role-option-btn glass-panel"
            aria-label="Switch to shopping mode"
          >
            <div className="role-option-icon">🛒</div>
            <div className="role-option-content">
              <span className="role-option-label">Shopping Mode</span>
              <span className="role-option-action">Switch to shopping mode</span>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('vendor')}
            className="role-option-btn glass-panel"
            aria-label="Switch to Dashboard"
          >
            <div className="role-option-icon">💼</div>
            <div className="role-option-content">
              <span className="role-option-label">Vendor Dashboard</span>
              <span className="role-option-action">Switch to Dashboard</span>
            </div>
          </button>
        </div>

        <div className="role-selection-footer">
          Logged in as <span className="user-email">{user?.email}</span>
        </div>
      </div>
    </div>
  );
}
