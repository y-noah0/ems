import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://localhost:5000/api/school';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const schoolService = {
  getAllSchools: async () => {
    try {
      const response = await api.get('/');
      return response.data.schools;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load schools');
      throw error;
    }
  },
  deleteSchool: async (id) => {
    try {
      const response = await api.delete(`/${id}`);
      toast.success('School deleted successfully!');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete school');
      throw error;
    }
  },
  createSchool: async (schoolData) => {
    try {
      const response = await api.post('/', schoolData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('School created successfully!');
      return response.data.school;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create school');
      throw error;
    }
  },
  getSchoolById: async (id) => {
    try {
      const response = await api.get(`/${id}`);
      return response.data.school;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load school');
      throw error;
    }
  },
  updateSchool: async (id, schoolData) => {
    try {
      const response = await api.patch(`/${id}`, schoolData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('School updated successfully!');
      return response.data.school;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update school');
      throw error;
    }
  },

  // Add a trade to school's offerings
  addTradeToSchool: async (schoolId, tradeId) => {
    try {
      const response = await api.post(`/${schoolId}/trades/${tradeId}`);
      return response.data.tradesOffered;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add trade to school');
      throw error;
    }
  },
  // Remove a trade from school's offerings
  removeTradeFromSchool: async (schoolId, tradeId) => {
    try {
      const response = await api.delete(`/${schoolId}/trades/${tradeId}`);
      return response.data.tradesOffered;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove trade from school');
      throw error;
    }
  },
  getTradesOfferedBySchool: async (id) => {
    try {
      const response = await api.get(`/${id}/trades`);
      return response.data.tradesOffered;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load trades offered');
      throw error;
    }
  }

};

export default schoolService;