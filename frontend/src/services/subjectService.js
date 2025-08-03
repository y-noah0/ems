import axios from 'axios';
import { toast } from 'react-toastify';

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
      const response = await api.get('/subjects', { params: { schoolId } });
      return response.data.subjects;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load subjects';
      toast.error(message);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  getSubjectById: async (id, schoolId) => {
    try {
      const response = await api.get(`/subjects/${id}`, { params: { schoolId } });
      return response.data.subject;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load subject';
      toast.error(message);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  createSubject: async (subjectData) => {
    try {
      const response = await api.post('/subjects', subjectData);
      toast.success('Subject created successfully!');
      return response.data.subject;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create subject';
      toast.error(message);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  updateSubject: async (id, subjectData) => {
    try {
      const response = await api.put(`/subjects/${id}`, subjectData);
      toast.success('Subject updated successfully!');
      return response.data.subject;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update subject';
      toast.error(message);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  deleteSubject: async (id, schoolId) => {
    try {
      const response = await api.delete(`/subjects/${id}`, { params: { schoolId } });
      toast.success('Subject deleted successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete subject';
      toast.error(message);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  getClassesBySubject: async (subjectId, schoolId) => {
    try {
      const response = await api.get(`/subjects/${subjectId}/classes`, { params: { schoolId } });
      return response.data.classes;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load classes for subject';
      toast.error(message);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  }
};

export default subjectService;