import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.log('No token found in localStorage');
        }
        return config;
    },
    error => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    response => response,
    error => {
        console.error('Response error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        return Promise.reject(error);
    }
);

const teacherService = {
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            console.log('Register response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Register error:', error.response?.data || error.message);
            throw error.response ? error.response.data : { message: 'Network error' };
        }
    },

    fetchTeachers: async (schoolId) => {
        try {
            const response = await api.post('/teachers', { schoolId });
            console.log('Fetch teachers response:', response.data.teachers);
            return response.data.teachers;
        } catch (error) {
            console.error('Fetch teachers error:', error.response?.data || error.message);
            throw error.response ? error.response.data : { message: 'Network error' };
        }
    },

    fetchSchools: async () => {
        try {
            const response = await api.get('/schools');
            console.log('Fetch schools response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Fetch schools error:', error.response?.data || error.message);
            throw error.response ? error.response.data : { message: 'Network error' };
        }
    },

    updateTeacher: async (teacherData) => {
        try {
            const response = await api.put('/teachers', teacherData);
            console.log('Update teacher response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Update teacher error:', error.response?.data || error.message);
            throw error.response ? error.response.data : { message: 'Network error' };
        }
    },

    deleteTeacher: async ({ schoolId, teacherId }) => {
        try {
            const response = await api.delete('/teachers', { data: { schoolId, teacherId } });
            console.log('Delete teacher response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Delete teacher error:', error.response?.data || error.message);
            throw error.response ? error.response.data : { message: 'Network error' };
        }
    }
};

export default teacherService;