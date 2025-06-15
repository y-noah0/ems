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

// Exam service
const examService = {
  // Create exam
  createExam: async (examData) => {
    try {
      const response = await api.post('/exams', examData);
      return response.data.exam;
    } catch (err) {
      console.error('Error creating exam:', err);
      throw err.response ? err.response.data : { message: 'Failed to create exam. Please try again.' };
    }
  },

  // Get teacher's exams
  getTeacherExams: async () => {
    try {
      const response = await api.get('/exams/teacher');
      return response.data.exams;
    } catch (error) {
      console.error('Error fetching teacher exams:', error);
      throw error.response ? error.response.data : { message: 'Failed to load exams. Please try again.' };
    }
  },

  // Get exam by ID
  getExamById: async (id) => {
    try {
      const response = await api.get(`/exams/${id}`);
      return response.data.exam;
    } catch (err) {
      console.error('Error fetching exam details:', err);
      throw err.response ? err.response.data : { message: 'Failed to load exam details. Please try again.' };
    }
  },

  // Update exam
  updateExam: async (id, examData) => {
    try {
      const response = await api.put(`/exams/${id}`, examData);
      return response.data.exam;
    } catch (error) {
      console.error('Error updating exam:', error);
      throw error.response ? error.response.data : { message: 'Failed to update exam. Please try again.' };
    }
  },

  // Delete exam
  deleteExam: async (id) => {
    try {
      const response = await api.delete(`/exams/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error.response ? error.response.data : { message: 'Failed to delete exam. Please try again.' };
    }
  },

  // Get upcoming exams for student
  getUpcomingExamsForStudent: async () => {
    try {
      const response = await api.get('/exams/student/upcoming');
      return response.data.exams;
    } catch (error) {
      console.error('Error fetching upcoming exams:', error);
      throw error.response ? error.response.data : { message: 'Failed to load upcoming exams. Please try again.' };
    }
  },

  // Activate exam
  activateExam: async (id) => {
    try {
      const response = await api.put(`/exams/${id}/activate`);
      return response.data.exam;
    } catch (error) {
      console.error('Error activating exam:', error);
      throw error.response ? error.response.data : { message: 'Failed to activate exam. Please try again.' };
    }
  },

  // Complete exam
  completeExam: async (id) => {
    try {
      const response = await api.put(`/exams/${id}/complete`);
      return response.data.exam;
    } catch (error) {
      console.error('Error completing exam:', error);
      throw error.response ? error.response.data : { message: 'Failed to complete exam. Please try again.' };
    }
  },

  // Get exam submissions
  getExamSubmissions: async (examId) => {
    try {
      const response = await api.get(`/exams/${examId}/submissions`);
      return response.data.submissions;
    } catch (error) {
      console.error('Error fetching exam submissions:', error);
      throw error.response ? error.response.data : { message: 'Failed to load submissions. Please try again.' };
    }
  },

  // Get submission by ID
  getSubmissionById: async (submissionId) => {
    try {
      const response = await api.get(`/submissions/${submissionId}`);
      return response.data.submission;
    } catch (err) {
      console.error('Error fetching submission details:', err);
      throw err.response ? err.response.data : { message: 'Failed to load submission details. Please try again.' };
    }
  },

  // Schedule an exam
  scheduleExam: async (id, scheduleData) => {
    try {
      const response = await api.put(`/exams/${id}/schedule`, scheduleData);
      return response.data.exam;
    } catch (error) {
      console.error('Error scheduling exam:', error);
      throw error.response ? error.response.data : { message: 'Failed to schedule exam. Please try again.' };
    }
  },

  // Get teacher subjects
  getTeacherSubjects: async () => {
    try {
      const response = await api.get('/subjects/teacher');
      return response.data.subjects;
    } catch (err) {
      console.error('Error fetching teacher subjects:', err);
      throw err.response ? err.response.data : { message: 'Failed to load subjects. Please try again.' };
    }
  },

  // Update submission with grades
  updateSubmissionGrades: async (submissionId, gradesData) => {
    try {
      const response = await api.put(`/submissions/${submissionId}/grade`, gradesData);
      return response.data.submission;
    } catch (err) {
      console.error('Error updating submission grades:', err);
      throw err.response ? err.response.data : { message: 'Failed to update grades. Please try again.' };
    }
  },

  // Get all teacher submissions
  getTeacherSubmissions: async () => {
    try {
      const response = await api.get('/submissions/teacher');
      return response.data.submissions;
    } catch (err) {
      console.error('Error fetching teacher submissions:', err);
      throw err.response ? err.response.data : { message: 'Failed to load submissions. Please try again.' };
    }
  }
};

export default examService;
