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

// Subject service
const subjectService = {
  getSubjects: async (schoolId) => {
    try {
      // backend route is /api/subjects with schoolId query param
      const response = await api.get('/subjects', { params: { schoolId } });
      return response.data.subjects;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  getSubjectById: async (id) => {
    try {
      const response = await api.get(`/subjects/${id}`);
      return response.data.subject;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  createSubject: async (subjectData) => {
    try {
      const response = await api.post('/subjects', subjectData);
      return response.data.subject;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  updateSubject: async (id, subjectData) => {
    try {
      const response = await api.put(`/subjects/${id}`, subjectData);
      return response.data.subject;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  deleteSubject: async (id) => {
    try {
      const response = await api.delete(`/subjects/${id}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  }
};

export default subjectService;
