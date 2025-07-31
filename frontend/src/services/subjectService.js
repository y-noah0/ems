import axios from 'axios';
export const getSubjects = async () => {
  const response = await axios.get('http://localhost:5000/api/subjects');
  
  return response.data.subjects; 
};
