// classService.js (corrected)
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

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

// Exported class functions
export const getClasses = async (schoolId) => {
  if (!schoolId) {
    throw new Error('schoolId is required to fetch classes');
  }
  try {
    const res = await api.get('/class', {
      params: { schoolId }
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
};

export const createClass = async (classData) => {
  try {
    const res = await api.post('/class', classData);
    return res.data;
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.msg ||
                    error.response?.data?.message ||
                    'Failed to create class';
    throw new Error(message);
  }
};
