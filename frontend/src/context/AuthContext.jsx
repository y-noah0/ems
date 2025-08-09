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
      try {
        if (authService.isAuthenticated()) {
          // First, try to get user from localStorage immediately
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setCurrentUser(storedUser);
            setLoading(false); // Set loading to false early for better UX
            
            // Then, optionally refresh user data in background if needed
            // Only do this if the stored data is older than 30 minutes
            const lastLogin = storedUser.lastLogin ? new Date(storedUser.lastLogin) : null;
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            
            if (!lastLogin || lastLogin < thirtyMinutesAgo) {
              try {
                console.log('Refreshing user data in background...');
                const freshUser = await authService.getCurrentUser();
                if (JSON.stringify(freshUser) !== JSON.stringify(storedUser)) {
                  setCurrentUser(freshUser);
                  console.log('User data updated from server');
                }
              } catch (error) {
                console.warn('Failed to refresh user data, using cached data:', error);
                // Keep using stored user data if server fails - don't logout
              }
            }
          } else {
            // No stored user, must fetch from server
            try {
              const user = await authService.getCurrentUser();
              setCurrentUser(user);
            } catch (error) {
              console.error('Failed to get user from server:', error);
              // If we can't get user data and there's no stored data, logout
              authService.logout();
            }
          }
        } else {
          // No token, user is not authenticated
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // Only logout if there's a critical error, not network issues
        if (error.message && error.message.includes('token')) {
          authService.logout();
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (identifier, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(identifier, password);
      setCurrentUser(data.user);
      console.log(data.user,"thisisthedatast")
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
    isAuthenticated: !!currentUser
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
