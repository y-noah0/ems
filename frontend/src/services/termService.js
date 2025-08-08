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


// Get terms
export const getTerms = async (schoolId) => {
  try {
    const res = await api.get('/terms', {
      params: { schoolId }
    });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.msg ||
                    error.response?.data?.message ||
                    'Failed to fetch terms';
    throw new Error(message);
    }
};

