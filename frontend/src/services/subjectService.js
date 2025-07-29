import axios from 'axios';
export const getSubjects = async () => (await axios.get('/api/subjects')).data;