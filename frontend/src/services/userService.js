import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token to requests
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

// User service
const userService = {
  // Get all headmasters
  getHeadmasters: async () => {
    try {
      const response = await api.get('/auth');
      // Filter for headmasters only
      const headmasters = response.data.staff.filter(user => user.role === 'headmaster');
      return headmasters;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get all staff (includes headmasters)
  getAllStaff: async () => {
    try {
      const response = await api.get('/system-admin/staff');
      return response.data.staff;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    try {
      const response = await api.get(`/system-admin/users/${id}`);
      return response.data.user;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Create headmaster
  createHeadmaster: async (headmasterData) => {
    try {
      const response = await api.post('/auth/register', {
        ...headmasterData,
        role: 'headmaster',
        schoolId: null // headmaster school is null at creation
      });
      return response.data.user;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/system-admin/users/${id}`, userData);
      return response.data.user;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Delete user
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/system-admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Assign school to headmaster
  assignSchoolToHeadmaster: async (headmasterId, schoolId) => {
    try {
      const response = await api.put(`/system-admin/users/${headmasterId}`, {
        schoolId: schoolId
      });
      return response.data.user;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  }
};

export default userService;
