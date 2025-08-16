import axios from 'axios';

// Create a lightweight axios instance (prefer existing env base URL)
const http = axios.create({ baseURL: import.meta?.env?.VITE_API_BASE_URL || '/api' });
http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const notificationService = {
  async fetchNotifications(schoolId){
    const { data } = await http.get(`/notifications`, { params: { schoolId }});
    return data.notifications || [];
  },
  async markAsRead(notificationId, schoolId){
    await http.put(`/notifications/${notificationId}/read`, { schoolId });
  },
  async markAllAsRead(schoolId){
    await http.put(`/notifications/read/all`, { schoolId });
  },
  async deleteNotification(notificationId, schoolId){
    await http.delete(`/notifications/${notificationId}`, { data: { schoolId } });
  }
};

export default notificationService;
