import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

const headmasterService = {
  // Exams (reuse /exams/school endpoint)
  getExams: async (schoolId, termId = null) => {
    const params = termId ? { schoolId, termId } : { schoolId };
    const response = await api.get('/exams/school', { params });
    return response.data?.exams || [];
  },
  getTradesOffered: async () => {
    const response = await api.get('/headmaster/trades');
    return response.data.trades;
  },
  addTradeOffered: async (tradeId) => {
    const response = await api.post(`/headmaster/trades/${tradeId}`);
    return response.data.trades;
  },
  removeTradeOffered: async (tradeId) => {
    const response = await api.delete(`/headmaster/trades/${tradeId}`);
    return response.data.trades;
  },
  getSubjectsCatalog: async (schoolId) => {
    const response = await api.get('/headmaster/subjects', {schoolId: schoolId});
    return response.data.subjects;
  },
  createSubject: async (subjectData) => {
    const response = await api.post('/headmaster/subjects', subjectData);
    return response.data.subject;
  }
};

export default headmasterService;
