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

// Trade service
const tradeService = {
  getAllTrades: async () => {
    try {
      const response = await api.get('/trade');
      return response.data.trades;

    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  getTradeById: async (id) => {
    try {
      const response = await api.get(`/trade/${id}`);
      // backend returns single trade in 'trade'
      return response.data.trade;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  // Create a new trade
  createTrade: async (payload) => {
    try {
      const response = await api.post('/trade', payload);
      // backend returns created trade in 'trade'
      return response.data.trade;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  // Delete a trade by ID
  deleteTrade: async (id) => {
    try {
      const response = await api.delete(`/trade/${id}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  // Get trades offered by a specific school
  getTradesBySchool: async (schoolId) => {
    try {
      const response = await api.get(`/schools/${schoolId}/trades`);
      return response.data.tradesOffered;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  }
};

export default tradeService;
