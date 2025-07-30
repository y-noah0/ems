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
      return response.data.trades;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  }
};

export default tradeService;
