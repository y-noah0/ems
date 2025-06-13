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

// Admin service
const adminService = {
  // Classes
  getAllClasses: async () => {
    try {
      const response = await api.get('/admin/classes');
      return response.data.classes;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Get classes for teachers (uses a different endpoint with teacher access)
  getTeacherClasses: async () => {
    try {
      const response = await api.get('/exams/classes');
      return response.data.classes;
    } catch (error) {
      console.error('Error fetching classes for teacher:', error);
      throw error.response ? error.response.data : { message: 'Failed to load classes. Please try again.' };
    }
  },

  createClass: async (classData) => {
    try {
      const response = await api.post('/admin/classes', classData);
      return response.data.class;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  updateClass: async (id, classData) => {
    try {
      const response = await api.put(`/admin/classes/${id}`, classData);
      return response.data.class;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  deleteClass: async (id) => {
    try {
      const response = await api.delete(`/admin/classes/${id}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Subjects
  getSubjectsByClass: async (classId) => {
    try {
      const response = await api.get(`/admin/classes/${classId}/subjects`);
      return response.data.subjects;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  createSubject: async (subjectData) => {
    try {
      const response = await api.post('/admin/subjects', subjectData);
      return response.data.subject;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Error creating subject' };
    }
  },
  
  assignTeacherToSubject: async (subjectId, teacherId) => {
    try {
      const response = await api.put(`/admin/subjects/${subjectId}/assign-teacher`, { teacherId });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Error assigning teacher to subject' };
    }
  },

  // Teachers
  getAllTeachers: async () => {
    try {
      const response = await api.get('/admin/teachers');
      return response.data.teachers;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  // Students
  getStudentsByClass: async (classId) => {
    try {
      if (!classId) {
        console.error('Invalid class ID provided to getStudentsByClass');
        return [];
      }
      
      const response = await api.get(`/admin/classes/${classId}/students`);
      return response.data.students;
    } catch (error) {
      console.error('Error fetching students by class:', error);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  createStudent: async (studentData) => {
    try {
      const response = await api.post('/admin/students', studentData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Error creating student' };
    }
  },
  
  importStudents: async (formData) => {
    try {
      // For file uploads, we need to use multipart/form-data
      const response = await api.post('/admin/import-students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Error importing students' };
    }
  },
  
  // Import students from CSV
  importStudentsFromCSV: async (file, classId) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('classId', classId);
      
      const response = await axios.post(`${API_URL}/admin/import-students`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Get individual student by ID
  getStudentById: async (studentId) => {
    try {
      const response = await api.get(`/admin/students/${studentId}`);
      return response.data.student;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Get student results by ID
  getStudentResults: async (studentId) => {
    try {
      const response = await api.get(`/admin/students/${studentId}/results`);
      return response.data.results;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  
  // Get class by ID
  getClassById: async (classId) => {
    try {
      const response = await api.get(`/admin/classes/${classId}`);
      return response.data.class;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  // Get individual student by 
};

export default adminService;
