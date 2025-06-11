import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to include auth token in requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

const systemAdminService = {
  // Get all staff members (teachers, deans, admins)
  getAllStaff: async () => {
    try {
      const response = await api.get('/system-admin/staff');
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Get a specific user
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/system-admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Create a new staff member
  createStaff: async (userData) => {
    try {
      const response = await api.post('/system-admin/staff', userData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Update user data
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/system-admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Delete a user
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/system-admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Reset a user's password
  resetPassword: async (userId, newPassword) => {
    try {
      const response = await api.post(`/system-admin/users/${userId}/reset-password`, { newPassword });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  }
};

export default systemAdminService;
