import axios from 'axios';

const API_URL = 'http://localhost:5000/api/class';

/**
 * Fetch classes for a given schoolId
 * @param {string} schoolId
 */
export const getClasses = async (schoolId) => {
  if (!schoolId) {
    throw new Error('schoolId is required to fetch classes');
  }
  try {
    const res = await axios.get(API_URL, {
      params: { schoolId }
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
};


/**
 * Create a new class
 * @param {Object} classData
 */
export const createClass = async (classData) => {
  try {
    const res = await axios.post(API_URL, classData);
    return res.data;
  } catch (error) {
    if (error.response) {
      // Backend responded with a status code outside 2xx
      console.error('Error creating class:', error.response.data);
      // Throw the first error message if available
      const message = error.response.data.errors?.[0]?.msg || error.response.data.message || 'Failed to create class';
      throw new Error(message);
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('No response from server');
    } else {
      console.error('Error creating class:', error.message);
      throw error;
    }
  }
};