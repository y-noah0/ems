import axios from "axios";
import { toast } from "react-toastify";

const API_URL = "http://localhost:5000/api";

// Create axios instance with base URL
const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add interceptor to include auth token in requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Auth service
const authService = {
login: async (identifier, password) => {
  try {
    console.log('Attempting login with:', { identifier, password });
    const response = await api.post('/auth/login', { identifier, password });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }

    console.log('Login successful:', response.data);
    return response.data;

  } catch (error) {
    console.error('Login error:', error.response?.data);
    throw error.response ? error.response.data : { message: 'Network error' };
  }
    },
    register: async (studentData) => {
        try {
    const res = await api.post('/auth/register', studentData);
    return res.data;
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.msg ||
                    error.response?.data?.message ||
                    'Failed to create student';
    throw new Error(message);
  }
    },



    // Logout user
    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.success("Logout successful");
    },

    // Get current user
    getCurrentUser: async () => {
        try {
            const response = await api.get("/auth/me");
            return response.data.user;
        } catch (error) {
            throw error.response
                ? error.response.data
                : { message: "Network error" };
        }
    },
      getHeadmaster: async (email) => {
    try {
      const response = await api.post('auth/fetch-headmaster', {email})
      return response.data.user
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Network error' };
    }
  },

    // Change password
    changePassword: async (currentPassword, newPassword) => {
        try {
            const response = await api.put("/auth/change-password", {
                currentPassword,
                newPassword,
            });
            toast.success("Password changed successfully");
            return response.data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Password change failed"
            );
            throw error.response
                ? error.response.data
                : { message: "Network error" };
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return localStorage.getItem("token") !== null;
    },

    // Get user from localStorage
    getUser: () => {
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    },

    verifyEmail: async (tk) => {
      const token = {token: tk}
        try {
            const response = await api.post("/auth/verify-email", token);
            toast.success("Password changed successfully");
            return response.data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Password change failed"
            );
            throw error.response
                ? error.response.data
                : { message: "Network error" };
        }
    },
};

export default authService;
