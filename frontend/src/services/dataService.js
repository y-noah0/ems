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

// Data service for fetching classes, subjects, users, etc.
const dataService = {
  // Get all classes
  getClasses: async () => {
    try {
      const response = await api.get('/admin/classes');
      return response.data.classes || [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw error.response ? error.response.data : { message: 'Failed to load classes' };
    }
  },

  // Get all subjects
  getSubjects: async () => {
    try {
      const response = await api.get('/admin/subjects');
      return response.data.subjects || [];
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error.response ? error.response.data : { message: 'Failed to load subjects' };
    }
  },

  // Get all users
  getUsers: async () => {
    try {
      const response = await api.get('/admin/users');
      return response.data.users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error.response ? error.response.data : { message: 'Failed to load users' };
    }
  },

  // Get student exams
  getStudentExams: async () => {
    try {
      const response = await api.get('/exams/student');
      return response.data.exams || [];
    } catch (error) {
      console.error('Error fetching student exams:', error);
      throw error.response ? error.response.data : { message: 'Failed to load exams' };
    }
  },

  // Get active exams for students
  getActiveExams: async () => {
    try {
      const response = await api.get('/exams/active');
      return response.data.exams || [];
    } catch (error) {
      console.error('Error fetching active exams:', error);
      throw error.response ? error.response.data : { message: 'Failed to load active exams' };
    }
  },

  // Get dashboard data for students
  getStudentDashboard: async () => {
    try {
      const response = await api.get('/dashboard/student');
      return response.data;
    } catch (error) {
      console.error('Error fetching student dashboard:', error);
      // Return empty data structure if API call fails
      return {
        upcomingExams: [],
        recentResults: [],
        stats: {
          totalExams: 0,
          completedExams: 0,
          averageScore: 0
        }
      };
    }
  },

  // Get dashboard data for teachers
  getTeacherDashboard: async () => {
    try {
      const response = await api.get('/dashboard/teacher');
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher dashboard:', error);
      // Return empty data structure if API call fails
      return {
        totalExams: 0,
        activeExams: 0,
        totalStudents: 0,
        pendingGrading: 0,
        recentExams: [],
        recentSubmissions: []
      };
    }
  }
};

export default dataService;
