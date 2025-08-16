import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ToastContext } from './ToastContext';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';

const NotificationContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { currentUser, isAuthenticated } = useAuth();
  const toastCtx = useContext(ToastContext); // optional toast integration

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    try {
      const schoolId = currentUser?.schoolId || currentUser?.school?.id || currentUser?.school?._id;
      if (schoolId) await notificationService.markAsRead(notificationId, schoolId);
    } catch (e) {
      console.warn('Failed to persist markAsRead', e);
    }
  }, [currentUser]);

  // Route builder per notification type + user role
  const buildNotificationRoute = useCallback((notification, role) => {
    const n = notification;
    const r = role || 'guest';

    const map = {
      review_request: () => {
        // Prefer submission detail route; fall back to exam if needed
        if (n.submissionId) return `/teacher/exams/${n.examId || ''}/submissions/${n.submissionId}`.replace(/\/submissions\/$/, '/submissions');
        if (n.examId) return `/teacher/exams/${n.examId}`;
        return null;
      },
      exam_scheduled: () => n.examId ? (r === 'teacher' ? `/teacher/exams/${n.examId}` : `/exams/${n.examId}`) : null,
      exam_updated: () => n.examId ? (r === 'teacher' ? `/teacher/exams/${n.examId}` : `/exams/${n.examId}`) : null,
      submission_graded: () => n.submissionId ? (r === 'student' ? `/results/${n.submissionId}` : `/grading/${n.submissionId}`) : null,
      class_created: () => n.classId ? (r === 'teacher' ? `/teacher/classes/${n.classId}` : `/classes/${n.classId}`) : null,
      class_updated: () => n.classId ? (r === 'teacher' ? `/teacher/classes/${n.classId}` : `/classes/${n.classId}`) : null,
      class_deleted: () => '/classes',
      enrollment_confirmed: () => r === 'student' ? '/student/dashboard' : '/dashboard',
      promotion_result: () => r === 'student' ? '/student/promotions' : '/admin/promotions',
      promotion_started: () => r === 'admin' ? '/admin/promotions' : '/dashboard',
      exam_cancelled: () => '/exams',
      submission_received: () => n.submissionId ? `/submissions/${n.submissionId}` : '/submissions',
      user_registered: () => r === 'admin' ? '/admin/users' : '/users',
      user_updated: () => r === 'admin' ? '/admin/users' : '/users',
      user_deleted: () => r === 'admin' ? '/admin/users' : '/users',
      term_created: () => '/terms',
      term_updated: () => '/terms',
      term_deleted: () => '/terms',
      staff_created: () => r === 'admin' ? '/admin/staff' : '/staff',
      password_reset: () => '/settings/security'
    };

    if (typeof n.link === 'string') return n.link; // explicit server-provided link
    const builder = map[n.type];
    return builder ? builder() : null;
  }, []);

  // Handle notification click with dynamic routing
  const handleNotificationClick = useCallback((notification) => {
    markAsRead(notification.id);
    const role = currentUser?.role;
    const target = buildNotificationRoute(notification, role);
    if (target) {
      window.location.href = target;
    } else {
      console.log('No route mapping for notification type:', notification.type);
    }
  }, [markAsRead, currentUser, buildNotificationRoute]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.type,
          silent: notification.priority === 'low'
        });

        // Close notification after 5 seconds
        setTimeout(() => {
          browserNotification.close();
        }, 5000);

        // Handle click on notification
        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
          handleNotificationClick(notification);
        };
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }
  }, [handleNotificationClick]);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const token = localStorage.getItem('token');
      const userId = currentUser.id || currentUser._id; // support both id formats
      if (token && userId) {
        console.log('🔌 Initializing socket connection for user:', userId);
        socketService.connect(userId, token);
      } else {
        console.warn('⚠️ Missing token or user id for socket connection', { tokenExists: !!token, userId });
      }
    } else {
      socketService.disconnect();
      setNotifications([]);
      setIsConnected(false);
      setConnectionError(null);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, currentUser]);

  // Socket event listeners
  useEffect(() => {
    const handleSocketConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('✅ Socket connected in context');
    };

    const handleSocketDisconnected = (data) => {
      setIsConnected(false);
      console.log('🔌 Socket disconnected in context:', data.reason);
    };

    const handleSocketError = (data) => {
      setConnectionError(data.error);
      setIsConnected(false);
      console.error('❌ Socket error in context:', data.error);
    };

    const handleSocketAuthenticated = (data) => {
      console.log('🔐 Socket authenticated in context:', data);
    };

    const handleSocketAuthError = (error) => {
      setConnectionError(error.message || 'Authentication failed');
      console.error('🔐 Socket auth error in context:', error);
    };

    const handleNotificationReceived = (notification) => {
      console.log('📧 Processing notification in context:', notification);
      
      const processedNotification = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        read: false,
        type: notification.type || 'general',
        title: notification.title || 'Notification',
        message: notification.message || '',
        icon: notification.icon || '📢',
        priority: notification.priority || 'medium',
  // Preserve metadata for routing (examId, submissionId, studentId, questionIds)
  examId: notification.examId || notification.relatedExamId || null,
  submissionId: notification.submissionId || notification.relatedId || null,
  studentId: notification.studentId || null,
  questionIds: notification.questionIds || [],
        ...notification
      };

      setNotifications(prev => {
        const exists = prev.some(n => 
          n.type === processedNotification.type && 
          n.message === processedNotification.message &&
          (Date.now() - new Date(n.timestamp).getTime()) < 5000
        );
        
        if (exists) {
          console.log('🔄 Duplicate notification ignored');
          return prev;
        }

        const newNotifications = [processedNotification, ...prev].slice(0, 100);
        showBrowserNotification(processedNotification);
        if (toastCtx?.showToast) {
          try {
            const toastMsg = processedNotification.title + (processedNotification.message ? ' - ' + processedNotification.message : '');
            // Map priority to toast type
            const typeMap = { high: 'error', medium: 'info', low: 'success' };
            toastCtx.showToast(toastMsg, typeMap[processedNotification.priority] || 'info');
          } catch (e) {
            console.warn('Toast display failed', e);
          }
        }
        // Expose last notification for quick debugging
        window.__lastNotification = processedNotification;
        // Trigger a custom event for any external listeners (e.g., toast system)
        window.dispatchEvent(new CustomEvent('app:new-notification', { detail: processedNotification }));
        return newNotifications;
      });
    };

    socketService.on('socket_connected', handleSocketConnected);
    socketService.on('socket_disconnected', handleSocketDisconnected);
    socketService.on('socket_error', handleSocketError);
    socketService.on('socket_authenticated', handleSocketAuthenticated);
    socketService.on('socket_auth_error', handleSocketAuthError);
    socketService.on('notification_received', handleNotificationReceived);

    return () => {
      socketService.off('socket_connected', handleSocketConnected);
      socketService.off('socket_disconnected', handleSocketDisconnected);
      socketService.off('socket_error', handleSocketError);
      socketService.off('socket_authenticated', handleSocketAuthenticated);
      socketService.off('socket_auth_error', handleSocketAuthError);
      socketService.off('notification_received', handleNotificationReceived);
    };
  }, [showBrowserNotification, toastCtx]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
  }, []);

  // Additional functions
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const schoolId = currentUser?.schoolId || currentUser?.school?.id || currentUser?.school?._id;
      if (schoolId) await notificationService.markAllAsRead(schoolId);
    } catch (e) {
      console.warn('Failed to persist markAllAsRead', e);
    }
  }, [currentUser]);

  const removeNotification = useCallback(async (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    try {
      const schoolId = currentUser?.schoolId || currentUser?.school?.id || currentUser?.school?._id;
      if (schoolId) await notificationService.deleteNotification(notificationId, schoolId);
    } catch (e) {
      console.warn('Failed to persist deleteNotification', e);
    }
  }, [currentUser]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((notification) => {
    const processedNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      type: 'manual',
      title: 'Manual Notification',
      message: '',
      icon: '📢',
      priority: 'medium',
      ...notification
    };

    setNotifications(prev => [processedNotification, ...prev]);
    showBrowserNotification(processedNotification);
  }, [showBrowserNotification]);

  const joinRoom = useCallback((room) => {
    socketService.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room) => {
    socketService.leaveRoom(room);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const getNotificationsByPriority = useCallback((priority) => {
    return notifications.filter(n => n.priority === priority);
  }, [notifications]);

  const value = {
    notifications,
    isConnected,
    connectionError,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    addNotification,
    joinRoom,
    leaveRoom,
    handleNotificationClick,
    getNotificationsByType,
    getNotificationsByPriority,
  buildNotificationRoute,
  socketService
  };

  // Initial fetch from backend (max 50) after auth & socket connect
  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !currentUser) return;
      const schoolId = currentUser?.schoolId || currentUser?.school?.id || currentUser?.school?._id;
      if (!schoolId) return;
      try {
        const serverNotifications = await notificationService.fetchNotifications(schoolId);
        // Normalize to match in-memory shape
        const normalized = serverNotifications.map(n => ({
          id: n._id || n.id,
          timestamp: n.createdAt,
          read: n.isRead,
          type: n.type,
          title: n.title,
          message: n.message,
          relatedId: n.relatedId,
          relatedModel: n.relatedModel,
        }));
        setNotifications(prev => {
          // Avoid duplicating by id
            const existingIds = new Set(prev.map(p => p.id));
            const merged = [...normalized.filter(n => !existingIds.has(n.id)), ...prev];
            // Keep newest first
            return merged
              .sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 100);
        });
      } catch (e) {
        console.warn('Failed to fetch notifications', e);
      }
    };
    load();
  }, [isAuthenticated, currentUser]);

  // Debug helper (only in development)
  if (typeof window !== 'undefined' && !window.__notificationDebug) {
    window.__notificationDebug = {
      dump: () => console.table(notifications.map(n => ({ id: n.id, title: n.title, read: n.read, time: n.timestamp }))),
      addTest: (overrides = {}) => addNotification({ title: 'Test Notification', message: 'This is a test', ...overrides }),
      markAll: () => markAllAsRead(),
      clear: () => clearAllNotifications()
    };
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
