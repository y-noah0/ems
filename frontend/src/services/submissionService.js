import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to include auth token in requests
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

// Submission service
const submissionService = {
  // Start exam
  startExam: async (examId) => {
    try {
      const response = await api.post('/submissions/start', { examId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Save answers (auto-save)
  saveAnswers: async (submissionId, answers) => {
    try {
      const response = await api.post('/submissions/save', { submissionId, answers });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Submit exam
  submitExam: async (submissionId, answers) => {
    try {
      const response = await api.post('/submissions/submit', { submissionId, answers });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Auto-submit exam
  autoSubmitExam: async (submissionId, reason) => {
    try {
      const response = await api.post('/submissions/auto-submit', { submissionId, reason });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Log violation
  logViolation: async (submissionId, violationType, details) => {
    try {
      const response = await api.post('/submissions/log-violation', { 
        submissionId, 
        violationType,
        details
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get student submissions
  getStudentSubmissions: async () => {
    try {
      const response = await api.get('/submissions/student');
      return response.data.submissions;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get exam submissions (for teacher)
  getExamSubmissions: async (examId) => {
    try {
      const response = await api.get(`/submissions/exam/${examId}`);
      return response.data.submissions;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Grade open questions
  gradeOpenQuestions: async (submissionId, grades) => {
    try {
      const response = await api.post(`/submissions/${submissionId}/grade`, { grades });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get student results by term
  getStudentResultsByTerm: async (year, term) => {
    try {
      const response = await api.get('/submissions/student/results', {
        params: { year, term }
      });
      return response.data.results;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get submission details
  getSubmissionDetails: async (submissionId) => {
    try {
      const response = await api.get(`/submissions/${submissionId}`);
      return response.data.submission;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  }
};

export default submissionService;
