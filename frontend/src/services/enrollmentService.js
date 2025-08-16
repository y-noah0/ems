import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  paramsSerializer: {
    indexes: null // By default, axios converts arrays to indexes (a[0]=b&a[1]=c), this prevents that
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

const validateId = (id, name = 'ID') => {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new Error(`Invalid ${name} format`);
  }
};

const enrollmentService = {
  /**
   * Create a new enrollment
   * @param {Object} enrollmentData - Enrollment data
   * @returns {Promise<Object>} Created enrollment
   */
  createEnrollment: async (enrollmentData) => {
    try {
      validateId(enrollmentData.school, 'school ID');
      validateId(enrollmentData.class, 'class ID');
      validateId(enrollmentData.student, 'student ID');

      const response = await api.post('/enrollments', enrollmentData);
      toast.success('Enrollment created successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                     error.message || 
                     'Failed to create enrollment';
      toast.error(errorMsg);
      throw error;
    }
  },

  /**
   * Get enrollments with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of enrollments
   */
  getEnrollments: async (filters = {}) => {
    try {
       if (filters.schoolId && !filters.school) {
      filters.school = filters.schoolId;
      delete filters.schoolId;
    }
      if (filters.class) validateId(filters.class, 'class ID');
      if (filters.student) validateId(filters.student, 'student ID');

      const response = await api.get('/enrollments', { params: filters });
      return response.data;
    } catch (error) {
      const errorDetails = {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      };
      console.error('Enrollment service error:', errorDetails);
      throw error;
    }
  },

 getStudentsByClass: async (classId, schoolId) => {
    try {
        validateId(classId, 'class ID');
        validateId(schoolId, 'school ID');

        const response = await api.get('/enrollments', {
            params: {
                class: classId,
                school: schoolId, // Keep using 'school' to match model
                populate: 'student,class',
                isActive: true
            }
        });

        if (!response.data.enrollments) {
            throw new Error('Unexpected response format from server');
        }

        return response.data.enrollments.map(enrollment => ({
            ...enrollment.student,
            enrollmentId: enrollment._id
        }));
    } catch (error) {
        const errorDetails = {
            status: error.response?.status,
            data: error.response?.data,
            config: error.config
        };
        console.error('Enrollment fetch error:', errorDetails);
        throw error;
    }
},

  /**
   * Get enrollment by ID
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Enrollment details
   */
  getEnrollmentById: async (enrollmentId) => {
    try {
      validateId(enrollmentId, 'enrollment ID');

      const response = await api.get(`/enrollments/${enrollmentId}`);
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                     error.message || 
                     'Failed to fetch enrollment';
      console.error(errorMsg);
      throw error;
    }
  },

  /**
   * Update enrollment
   * @param {string} enrollmentId - Enrollment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated enrollment
   */
  updateEnrollment: async (enrollmentId, updateData) => {
    try {
      validateId(enrollmentId, 'enrollment ID');
      if (updateData.school) validateId(updateData.school, 'school ID');

      const response = await api.put(`/enrollments/${enrollmentId}`, updateData);
      toast.success('Enrollment updated successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                     error.message || 
                     'Failed to update enrollment';
      toast.error(errorMsg);
      throw error;
    }
  },

  /**
   * Delete enrollment
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Success message
   */
  deleteEnrollment: async (enrollmentId) => {
    try {
      validateId(enrollmentId, 'enrollment ID');

      const response = await api.delete(`/enrollments/${enrollmentId}`);
      toast.success('Enrollment deleted successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                     error.message || 
                     'Failed to delete enrollment';
      toast.error(errorMsg);
      throw error;
    }
  },

  /**
   * Remove student from class (delete enrollment)
   * @param {string} studentId - Student ID
   * @param {string} classId - Class ID
   * @param {string} schoolId - School ID
   * @returns {Promise<Object>} Success message
   */
  removeStudentFromClass: async (studentId, classId, schoolId) => {
    try {
      validateId(studentId, 'student ID');
      validateId(classId, 'class ID');
      validateId(schoolId, 'school ID');

      // Find the enrollment
      const response = await api.get('/enrollments', {
        params: {
          student: studentId,
          class: classId,
          school: schoolId
        }
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Enrollment not found');
      }

      // Delete the enrollment
      const deleteResponse = await api.delete(`/enrollments/${response.data[0]._id}`);
      toast.success('Student removed from class successfully!');
      return deleteResponse.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                     error.message || 
                     'Failed to remove student from class';
      toast.error(errorMsg);
      throw error;
    }
  }
};

export default enrollmentService;