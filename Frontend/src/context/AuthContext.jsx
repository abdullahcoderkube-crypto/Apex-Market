import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { decodeToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const expirationTimeoutRef = useRef(null);

  const logout = (isExpired = false) => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (expirationTimeoutRef.current) {
      clearTimeout(expirationTimeoutRef.current);
      expirationTimeoutRef.current = null;
    }
    if (isExpired) {
      sessionStorage.setItem('session_expired_message', 'Your login session expired, log-in again.');
    }
  };

  const scheduleTokenExpiration = (token) => {
    if (expirationTimeoutRef.current) {
      clearTimeout(expirationTimeoutRef.current);
      expirationTimeoutRef.current = null;
    }

    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return;

    const remainingTime = decoded.exp * 1000 - Date.now();
    if (remainingTime <= 0) {
      logout(true);
    } else {
      expirationTimeoutRef.current = setTimeout(() => {
        logout(true);
      }, remainingTime);
    }
  };

  useEffect(() => {
    // Check if user credentials and token are stored in localStorage
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      const decoded = decodeToken(storedToken);
      const isExpired = decoded && decoded.exp ? decoded.exp * 1000 < Date.now() : true;
      if (isExpired) {
        logout(true);
      } else {
        try {
          setUser(JSON.parse(storedUser));
          scheduleTokenExpiration(storedToken);
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          logout(true);
        }
      }
    }
    setLoading(false);

    const handleUnauthorized = () => {
      logout(true);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    return () => {
      if (expirationTimeoutRef.current) {
        clearTimeout(expirationTimeoutRef.current);
      }
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  const login = (token, chosenRole = null) => {
    const decoded = decodeToken(token);
    if (!decoded) return;

    let roles = decoded.userRole || [];
    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    // Determine the active role
    const activeRole = chosenRole || (roles.length === 1 ? roles[0] : null);

    const userData = {
      name: decoded.userName || decoded.userEmail.split('@')[0],
      email: decoded.userEmail,
      roles: roles,
      role: activeRole,
    };

    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    
    // Schedule expiration
    scheduleTokenExpiration(token);
  };

  const selectActiveRole = (role) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, role };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, selectActiveRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

