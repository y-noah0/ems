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

const examService = {
  // Create exam
  createExam: async (examData) => {
    try {
      const response = await api.post('/exams', examData);
      return response.data.exam;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get teacher's exams
  getTeacherExams: async () => {
    try {
      const response = await api.get('/exams/teacher');
      return response.data.exams;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get exam by ID (uses 'id' param to match backend)
  getExamById: async (examId) => {
    try {
      const response = await api.get(`/exams/${examId}`);
      return response.data.exam;
    } catch (error) {
      console.error('Error fetching exam details:', error);
      throw error.response ? error.response.data : { message: 'Failed to load exam details. Please try again.' };
    }
  },

  // Update exam
  updateExam: async (id, examData) => {
    try {
      // Ensure type is set
      if (!examData.type) {
        examData.type = 'midterm';
      }
      // Validate questions before sending to backend
      if (examData.questions && examData.questions.length > 0) {
        examData.questions = examData.questions.map(q => {
          const question = { ...q };
          if (!question.maxScore && question.points) {
            question.maxScore = parseInt(question.points);
          }
          if (!question.text) {
            question.text = 'Untitled question';
          }
          if (question.type === 'MCQ' && question.options) {
            if (Array.isArray(question.options) &&
              question.options[0] &&
              typeof question.options[0] === 'object') {
              const correctOption = question.options.find(o => o.isCorrect);
              question.correctAnswer = correctOption ? correctOption.text : '';
              question.options = question.options.map(o => o.text || '');
            }
          }
          return question;
        });
      }
      const response = await api.put(`/exams/${id}`, examData);
      return response.data.exam;
    } catch (error) {
      console.error('Error in updateExam:', error);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Delete exam
  deleteExam: async (id) => {
    try {
      const response = await api.delete(`/exams/${id}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get upcoming exams for student
  getUpcomingExamsForStudent: async () => {
    try {
      const response = await api.get('/exams/student/upcoming');
      return response.data.exams;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get all exams for student's class
  getStudentClassExams: async () => {
    try {
      const response = await api.get('/exams/student/class');
      return response.data.exams;
    } catch (error) {
      console.error('Error fetching class exams:', error);
      throw error.response ? error.response.data : { message: 'Failed to load class exams. Please try again.' };
    }
  },

  // Activate exam
  activateExam: async (id) => {
    try {
      const response = await api.put(`/exams/${id}/activate`);
      return response.data.exam;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Complete exam
  completeExam: async (id) => {
    try {
      const response = await api.put(`/exams/${id}/complete`);
      return response.data.exam;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get exam submissions
  getExamSubmissions: async (examId) => {
    try {
      const response = await api.get(`/submissions/exam/${examId}`);
      return response.data.submissions;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get submission by ID
  getSubmissionById: async (submissionId) => {
    try {
      const response = await api.get(`/submissions/${submissionId}`);
      return response.data.submission;
    } catch (error) {
      console.error('Error fetching submission details:', error);
      throw error.response ? error.response.data : { message: 'Failed to load submission. Please try again.' };
    }
  },

  // Schedule an exam
  scheduleExam: async (id, scheduleData) => {
    try {
      const response = await api.put(`/exams/${id}/schedule`, scheduleData);
      return response.data.exam;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get teacher subjects
  getTeacherSubjects: async () => {
    try {
      const response = await api.get('/subjects/teacher');
      return response.data.subjects;
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
      throw error.response ? error.response.data : { message: 'Failed to load subjects. Please try again.' };
    }
  },

  // Update submission with grades
  updateSubmissionGrades: async (submissionId, gradesData) => {
    try {
      // Use PUT for updating grades (RESTful)
      const response = await api.put(`/submissions/${submissionId}/grade`, gradesData);
      return response.data.submission;
    } catch (error) {
      console.error('Error grading submission:', error);
      throw error.response ? error.response.data : { message: 'Failed to save grades. Please try again.' };
    }
  },

  // Get all teacher submissions
  getTeacherSubmissions: async () => {
    try {
      const response = await api.get('/submissions/teacher');
      return response.data.submissions;
    } catch (error) {
      console.error('Error fetching teacher submissions:', error);
      throw error.response ? error.response.data : { message: 'Failed to load submissions' };
    }
  }
};

export default examService;
