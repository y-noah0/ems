import axios from 'axios';

const API_URL = 'localhost:5000/api/class';

export const getClasses = async () => {
  const res = await axios.get(API_URL);
  return res.data;
};

export const createClass = async (data) => {
  const res = await axios.post(API_URL, data);
  return res.data;
};