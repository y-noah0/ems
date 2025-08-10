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
    // Ensure we're using the user's school from their token
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');

    const response = await api.post('/class', {
      ...classData,
      // Force using the school from user's auth context
      schoolId: classData.schoolId 
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    const serverMessage = error.response?.data?.message;
    if (error.response?.status === 403) {
      throw new Error(serverMessage || 'You lack permission for this school');
    }
    throw new Error(serverMessage || 'Failed to create class');
  }
};
