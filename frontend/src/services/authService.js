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



    // Logout user
    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.success("Logout successful");
    },

    // Get current user (prioritize localStorage, fallback to server)
    getCurrentUser: async (forceRefresh = false) => {
        try {
            // First try to get user from localStorage
            const storedUser = localStorage.getItem("user");
            const token = localStorage.getItem("token");
            
            if (storedUser && token && !forceRefresh) {
                const user = JSON.parse(storedUser);
                // Check if user data is recent (less than 30 minutes old)
                const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
                const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
                
                if (lastLogin && lastLogin > thirtyMinutesAgo) {
                    console.log('Using cached user data from localStorage');
                    return user;
                }
            }
            
            // If no cached data, data is old, or forced refresh, fetch from server
            console.log('Fetching fresh user data from server');
            const response = await api.get("/auth/me");
            const userData = response.data.user;
            
            // Update localStorage with fresh data
            localStorage.setItem("user", JSON.stringify(userData));
            
            return userData;
        } catch (error) {
            console.error('Error getting current user:', error);
            
            // If server request fails, try to return cached data as fallback
            const storedUser = localStorage.getItem("user");
            const token = localStorage.getItem("token");
            
            if (storedUser && token) {
                console.log('Server failed, using cached user data');
                return JSON.parse(storedUser);
            }
            
            // If no cached data and server fails, throw error
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

    // Update user data in localStorage
    updateStoredUser: (userData) => {
        localStorage.setItem("user", JSON.stringify(userData));
    },

    // Get user from localStorage (no server call)
    getStoredUser: () => {
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    },

    // Get user from localStorage (deprecated - use getStoredUser instead)
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
