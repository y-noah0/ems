import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with custom configuration
const api = axios.create({ 
  baseURL: API_URL, 
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 second timeout
});

// Rate limiting: delay between requests
const REQUEST_DELAY = 100; // 100ms between requests
let lastRequestTime = 0;

// Request interceptor with rate limiting
api.interceptors.request.use(
  async config => {
    // Add authentication token
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    
    // Rate limiting - ensure minimum delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor to handle rate limiting
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Handle 429 Too Many Requests
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Wait for retry-after header or default to 2 seconds
      const retryAfter = error.response.headers['retry-after'] || 2;
      const delay = parseInt(retryAfter) * 1000;
      
      console.log(`Rate limit hit. Retrying after ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

// Utility function for handling API calls with exponential backoff
const  apiCall = async (apiFunction, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (error.response?.status === 429 && attempt < maxRetries) {
        const baseDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
        const jitter = Math.random() * 1000; // Add some randomness
        const delay = baseDelay + jitter;
        
        console.log(`Attempt ${attempt} failed with 429. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

const deanService = {
  // Class Management
  getAllClasses: async () => {
    return apiCall(async () => {
      const response = await api.get('/admin/classes');
      return response.data.classes;
    });
  },
  
  getClassById: async (classId) => {
    return apiCall(async () => {
      const response = await api.get(`/admin/classes/${classId}`);
      return response.data.class;
    });
  },
  
  createClass: async (classData) => {
    return apiCall(async () => {
      const response = await api.post('/admin/classes', classData);
      return response.data.class;
    });
  },
  
  updateClass: async (classId, classData) => {
    return apiCall(async () => {
      const response = await api.put(`/admin/classes/${classId}`, classData);
      return response.data.class;
    });
  },
  
  deleteClass: async (classId) => {
    return apiCall(async () => {
      const response = await api.delete(`/admin/classes/${classId}`);
      return response.data;
    });
  },
  
  // Student Management
  getStudentsByClass: async (classId) => {
    return apiCall(async () => {
      const response = await api.get(`/admin/classes/${classId}/students`);
      return response.data.students;
    });
  },
  
  getStudentById: async (studentId) => {
    return apiCall(async () => {
      const response = await api.get(`/admin/students/${studentId}`);
      return response.data.student;
    });
  },
  
  importStudents: async (formData) => {
    const response = await api.post('/admin/import-students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  // Teacher Management
  getAllTeachers: async () => {
    return apiCall(async () => {
      const response = await api.get('/admin/teachers');
      return response.data.teachers;
    });
  },
  
  assignTeacherToSubject: async (subjectId, teacherId) => {
    const response = await api.put(`/admin/subjects/${subjectId}/assign-teacher`, { teacherId });
    return response.data;
  },
  
  // Exam Management
  reviewExam: async (examId, status, feedback) => {
    const response = await api.put(`/exams/${examId}/review`, { status, feedback });
    return response.data;
  },
  
  // Reports
  generateClassReport: async (classId, termId) => {
    const response = await api.post('/reports/class/generate', { classId, termId });
    return response.data;
  },
  
  generateTermReport: async (termId) => {
    const response = await api.post('/reports/term/generate', { termId });
    return response.data;
  }
};

export default deanService;