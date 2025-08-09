import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to include auth token and schoolId in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // schoolId must be passed by the calling component
    if (config.schoolId) {
      if (['get', 'delete'].includes(config.method.toLowerCase())) {
        config.params = { ...config.params, schoolId: config.schoolId };
      } else if (['post', 'put'].includes(config.method.toLowerCase())) {
        config.data = { ...config.data, schoolId: config.schoolId };
      }
    } else {
      throw new Error('School ID is missing. Please ensure you are logged in with a valid school.');
    }
    return config;
  },
  (error) => {
    if (error.message.includes('School ID')) {
      toast.error(error.message);
    }
    return Promise.reject(error);
  }
);

const submissionService = {
  startExam: async (examId, schoolId) => {
    try {
      const response = await api.post('/submissions/start', { examId }, { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getAssessment1Results: async (schoolId) => {
    try {
      const response = await api.get('/submissions/results/assessment1', { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getAssessment2Results: async (schoolId) => {
    try {
      const response = await api.get('/submissions/results/assessment2', { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getExamResults: async (schoolId) => {
    try {
      const response = await api.get('/submissions/results/exam', { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getHomeworkResults: async (schoolId) => {
    try {
      const response = await api.get('/submissions/results/homework', { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getQuizResults: async (schoolId) => {
    try {
      const response = await api.get('/submissions/results/quiz', { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getCombinedResults: async (schoolId) => {
    try {
      const response = await api.get('/submissions/results/combined', { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getStudentMarks: async (studentId, schoolId) => {
    try {
      const response = await api.get('/submissions/student/marks', {
        params: { studentId },
        schoolId
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getMyMarks: async (schoolId) => {
    try {
      const response = await api.get('/submissions/my-marks', { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  saveAnswers: async (submissionId, answers, schoolId) => {
    try {
      const response = await api.post('/submissions/save', { submissionId, answers }, { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  submitExam: async (submissionId, answers, schoolId) => {
    try {
      const response = await api.post('/submissions/submit', { submissionId, answers }, { schoolId });
      toast.success('Exam submitted successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to submit exam';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  autoSubmitExam: async (submissionId, reason, schoolId) => {
    try {
      const response = await api.post('/submissions/auto-submit', { submissionId, reason }, { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  logViolation: async (submissionId, violationType, details, schoolId) => {
    try {
      const response = await api.post('/submissions/log-violation', {
        submissionId,
        violationType,
        details
      }, { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getStudentSubmissions: async (schoolId) => {
    try {
      const response = await api.get('/submissions/student', { schoolId });
      return response.data.submissions;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getExamSubmissions: async (examId, schoolId) => {
    try {
      const response = await api.get(`/submissions/exam/${examId}`, { schoolId });
      return response.data.submissions;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch exam submissions';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  gradeOpenQuestions: async (submissionId, grades, schoolId) => {
    try {
      const response = await api.post(`/submissions/${submissionId}/grade`, { grades }, { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getStudentResultsByTerm: async (termId, schoolId) => {
    try {
      const response = await api.get('/submissions/student/results', {
        params: { termId },
        schoolId
      });
      return response.data.results;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getSubmissionDetails: async (submissionId, schoolId) => {
    try {
      const response = await api.get(`/submissions/${submissionId}`, { schoolId });
      return response.data.submission;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  updateSubmissionGrades: async (submissionId, grades, schoolId) => {
    try {
      const response = await api.post(`/submissions/${submissionId}/update-grades`, { grades }, { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getTeacherSubmissions: async (schoolId) => {
    try {
      const response = await api.get('/submissions/teacher', { schoolId });
      return response.data.submissions;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  monitorExam: async (examId, schoolId) => {
    try {
      const response = await api.get(`/submissions/monitor/${examId}`, { schoolId });
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch exam monitoring data';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getResultsByAssessmentType: async (type, schoolId) => {
    try {
      const response = await api.get('/submissions/results/by-type', {
        params: { type },
        schoolId
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getCombinedDetailedResults: async (schoolId) => {
    try {
      const response = await api.get('/submissions/results/detailed', { schoolId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  getStudentResultsByAssessmentType: async (studentId, type, schoolId) => {
    try {
      const response = await api.get('/submissions/student/assessment-results', {
        params: { studentId, type },
        schoolId
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
};

export default submissionService;