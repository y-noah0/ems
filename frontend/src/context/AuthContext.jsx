import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

// Create context
const AuthContext = createContext();

// Context provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const loadUser = async () => {
      setLoading(true);
      try {
        if (authService.isAuthenticated()) {
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        authService.logout(); // Logout if token is invalid
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      setCurrentUser(data.user);
      return data.user;
    } catch (error) {
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.register(userData);
      setCurrentUser(data.user);
      return data.user;
    } catch (error) {
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      return response;
    } catch (error) {
      setError(error.message || 'Failed to change password');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Value to provide to consumers
  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    changePassword,
    isAuthenticated: authService.isAuthenticated()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
