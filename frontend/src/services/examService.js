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

const examService = {
  // Create exam
  createExam: async (examData, schoolId) => {
    try {
      console.log('Sending exam data:', examData, 'School ID:', schoolId); // Debug log
      const response = await api.post('/exams', examData, { schoolId });
      console.log('Response:', response.data); // Debug log
      toast.success('Exam created successfully!');
      return response.data.exam;
    } catch (error) {
      console.error('Create exam error:', error.response?.data); // Debug log
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.map(e => e.msg).join(', ') || 'Failed to create exam';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },
  // Get teacher's exams
  getTeacherExams: async (schoolId) => {
    try {
      const response = await api.get('/exams/teacher', { schoolId });
      return response.data.exams;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch teacher exams';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get exam by ID
  getExamById: async (examId, schoolId) => {
    try {
      const response = await api.get(`/exams/${examId}`, { schoolId });
      return response.data.exam;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to load exam details';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Failed to load exam details. Please try again.' };
    }
  },

  // Update exam
  updateExam: async (id, examData, schoolId) => {
    try {
      const allowedExamTypes = ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'];
      if (!examData.type) {
        examData.type = 'quiz';
      } else if (!allowedExamTypes.includes(examData.type)) {
        throw new Error(`Invalid exam type. Must be one of: ${allowedExamTypes.join(', ')}`);
      }
      if (examData.questions && examData.questions.length > 0) {
        examData.questions = examData.questions.map(q => {
          const question = { ...q };
          if (!question.maxScore && question.points) {
            question.maxScore = parseInt(question.points);
            delete question.points;
          }
          if (!question.text) {
            question.text = 'Untitled question';
          }
          if (question.type === 'MCQ') {
            question.type = 'multiple-choice';
          }
          if (question.type === 'multiple-choice' && question.options) {
            if (Array.isArray(question.options) && question.options.length > 0) {
              const correctOption = question.options.find(o => o.isCorrect);
              question.correctAnswer = correctOption ? correctOption.text : '';
              question.options = question.options.map(o => ({
                text: o.text || '',
                isCorrect: !!o.isCorrect
              }));
            } else {
              question.options = [];
              question.correctAnswer = '';
            }
          }
          return question;
        });
      }
      const response = await api.put(`/exams/${id}`, examData, { schoolId });
      toast.success('Exam updated successfully!');
      return response.data.exam;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update exam';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: error.message || 'Network error' };
    }
  },

  // Delete exam
  deleteExam: async (id, schoolId) => {
    try {
      const response = await api.delete(`/exams/${id}`, { schoolId });
      toast.success('Exam deleted successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to delete exam';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get upcoming exams for student
  getUpcomingExamsForStudent: async (schoolId) => {
    try {
      const response = await api.get('/exams/student/upcoming', { schoolId });
      return response.data.exams;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch upcoming exams';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get all exams for student's class
  getStudentClassExams: async (schoolId) => {
    try {
      const response = await api.get('/exams/student/class', { schoolId });
      return response.data.exams;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to load class exams';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Failed to load class exams. Please try again.' };
    }
  },

  // Activate exam
  activateExam: async (id, schoolId) => {
    try {
      const response = await api.put(`/exams/${id}/activate`, {}, { schoolId });
      toast.success('Exam activated successfully!');
      return response.data.exam;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to activate exam';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Complete exam
  completeExam: async (id, schoolId) => {
    try {
      const response = await api.put(`/exams/${id}/complete`, {}, { schoolId });
      toast.success('Exam completed successfully!');
      return response.data.exam;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to complete exam';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Schedule an exam
  scheduleExam: async (id, scheduleData, schoolId) => {
    try {
      const response = await api.put(`/exams/${id}/schedule`, scheduleData, { schoolId });
      toast.success('Exam scheduled successfully!');
      return response.data.exam;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to schedule exam';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get teacher subjects
  getTeacherSubjects: async (schoolId) => {
    try {
      const response = await api.get('/exams/subjects/teacher', { schoolId });
      return response.data.subjects;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch teacher subjects';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get classes for teacher
  getClassesForTeacher: async (schoolId) => {
    try {
      const response = await api.get('/exams/classes', { schoolId });
      return response.data.classes;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch teacher classes';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get exam submissions (assumes submissions.js route)
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

  // Get submission by ID (assumes submissions.js route)
  getSubmissionById: async (submissionId, schoolId) => {
    try {
      const response = await api.get(`/submissions/${submissionId}`, { schoolId });
      const data = response.data;
      if (data.success && data.submission) {
        const submission = data.submission;
        if (submission.status === 'graded' && (!submission.score || submission.score === 0)) {
          submission.score = submission.answers.reduce(
            (sum, answer) => sum + (parseInt(answer.score || answer.points || 0) || 0),
            0
          );
        }
        if (submission.answers) {
          submission.answers = submission.answers.map(answer => ({
            ...answer,
            points: parseInt(answer.score || answer.points || 0) || 0
          }));
        }
        return submission;
      }
      throw new Error('Invalid submission data received');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch submission';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Regrade submission (update existing manual grades) using update-grades endpoint
  regradeSubmission: async (submissionId, grades, schoolId) => {
    try {
      const response = await api.post(`/submissions/${submissionId}/update-grades`, { grades, submissionId }, { schoolId });
      toast.success('Submission regraded');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to regrade submission';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

  // Get all teacher submissions (assumes submissions.js route)
  getTeacherSubmissions: async (schoolId) => {
    try {
      const response = await api.get('/submissions/teacher', { schoolId });
      return response.data.submissions;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch teacher submissions';
      toast.error(errorMsg);
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  }
};

export default examService;