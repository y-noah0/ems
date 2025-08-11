import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.serverUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SERVER_URL)
      ? process.env.REACT_APP_SERVER_URL
      : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERVER_URL)
        ? import.meta.env.VITE_SERVER_URL
        : (typeof window !== 'undefined' && window.REACT_APP_SERVER_URL)
          ? window.REACT_APP_SERVER_URL
          : 'http://localhost:5000';
  }

  /**
   * Connect to Socket.IO server
   * @param {string} userId - The user ID for authentication
   * @param {string} token - JWT token for authentication
   */
  connect(userId, token) {
    if (this.socket) {
      this.disconnect();
    }

    try {
      this.socket = io(this.serverUrl, {
        query: { userId },
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.setupDefaultListeners();
      
      console.log('🔌 Attempting to connect to Socket.IO server...');
      
    } catch (error) {
      console.error('❌ Failed to initialize socket connection:', error);
    }
  }

  /**
   * Setup default socket event listeners
   */
  setupDefaultListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      this.isConnected = true;
      this.emit('socket_connected', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from Socket.IO server:', reason);
      this.isConnected = false;
      this.emit('socket_disconnected', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.isConnected = false;
      this.emit('socket_error', { error: error.message });
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('🔐 Socket authenticated:', data);
      this.emit('socket_authenticated', data);
    });

    this.socket.on('authentication_error', (error) => {
      console.error('🔐 Socket authentication error:', error);
      this.emit('socket_auth_error', error);
    });

    // Notification events - Main notification handler
    this.socket.on('notification', (data) => {
      console.log('📧 Notification received:', data);
      this.emit('notification_received', data);
    });

    // Specific notification event handlers
    this.setupNotificationListeners();
  }

  /**
   * Setup specific notification event listeners
   */
  setupNotificationListeners() {
    if (!this.socket) return;

    // Authentication notifications
    this.socket.on('user:registered', (data) => {
      console.log('👤 User registered notification:', data);
      this.emit('notification_received', {
        type: 'user_registered',
        title: 'New User Registered',
        message: data.message,
        icon: '👤',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('auth:login', (data) => {
      console.log('🔐 Login notification:', data);
      this.emit('notification_received', {
        type: 'auth_login',
        title: 'Login Activity',
        message: data.message,
        icon: '🔐',
        priority: 'low',
        ...data
      });
    });

    // Exam notifications
    this.socket.on('exam:scheduled', (data) => {
      console.log('📅 Exam scheduled notification:', data);
      this.emit('notification_received', {
        type: 'exam_scheduled',
        title: 'Exam Scheduled',
        message: data.message,
        icon: '📅',
        priority: 'high',
        ...data
      });
    });

    this.socket.on('exam:updated', (data) => {
      console.log('📝 Exam updated notification:', data);
      this.emit('notification_received', {
        type: 'exam_updated',
        title: 'Exam Updated',
        message: data.message,
        icon: '📝',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('exam:cancelled', (data) => {
      console.log('❌ Exam cancelled notification:', data);
      this.emit('notification_received', {
        type: 'exam_cancelled',
        title: 'Exam Cancelled',
        message: data.message,
        icon: '❌',
        priority: 'high',
        ...data
      });
    });

    // Submission notifications
    this.socket.on('submission:received', (data) => {
      console.log('📄 Submission received notification:', data);
      this.emit('notification_received', {
        type: 'submission_received',
        title: 'Submission Received',
        message: data.message,
        icon: '📄',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('submission:graded', (data) => {
      console.log('🎯 Submission graded notification:', data);
      this.emit('notification_received', {
        type: 'submission_graded',
        title: 'Grade Available',
        message: data.message,
        icon: '🎯',
        priority: 'high',
        ...data
      });
    });

    // Enrollment notifications
    this.socket.on('enrollment:confirmed', (data) => {
      console.log('✅ Enrollment confirmed notification:', data);
      this.emit('notification_received', {
        type: 'enrollment_confirmed',
        title: 'Enrollment Confirmed',
        message: data.message,
        icon: '✅',
        priority: 'high',
        ...data
      });
    });

    this.socket.on('student:joined', (data) => {
      console.log('🎓 Student joined notification:', data);
      this.emit('notification_received', {
        type: 'student_joined',
        title: 'New Student',
        message: data.message,
        icon: '🎓',
        priority: 'medium',
        ...data
      });
    });

    // Promotion notifications
    this.socket.on('promotion:started', (data) => {
      console.log('🚀 Promotion started notification:', data);
      this.emit('notification_received', {
        type: 'promotion_started',
        title: 'Promotion Process',
        message: data.message,
        icon: '🚀',
        priority: 'high',
        ...data
      });
    });

    this.socket.on('promotion:result', (data) => {
      console.log('🎉 Promotion result notification:', data);
      this.emit('notification_received', {
        type: 'promotion_result',
        title: 'Promotion Result',
        message: data.message,
        icon: '🎉',
        priority: 'high',
        ...data
      });
    });

    // Class management notifications
    this.socket.on('class:created', (data) => {
      console.log('🏫 Class created notification:', data);
      this.emit('notification_received', {
        type: 'class_created',
        title: 'New Class',
        message: data.message,
        icon: '🏫',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('class:updated', (data) => {
      console.log('📚 Class updated notification:', data);
      this.emit('notification_received', {
        type: 'class_updated',
        title: 'Class Updated',
        message: data.message,
        icon: '📚',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('class:deleted', (data) => {
      console.log('🗑️ Class deleted notification:', data);
      this.emit('notification_received', {
        type: 'class_deleted',
        title: 'Class Deleted',
        message: data.message,
        icon: '🗑️',
        priority: 'medium',
        ...data
      });
    });

    // Term management notifications
    this.socket.on('term:created', (data) => {
      console.log('📅 Term created notification:', data);
      this.emit('notification_received', {
        type: 'term_created',
        title: 'New Term',
        message: data.message,
        icon: '📅',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('term:updated', (data) => {
      console.log('📅 Term updated notification:', data);
      this.emit('notification_received', {
        type: 'term_updated',
        title: 'Term Updated',
        message: data.message,
        icon: '📅',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('term:deleted', (data) => {
      console.log('📅 Term deleted notification:', data);
      this.emit('notification_received', {
        type: 'term_deleted',
        title: 'Term Deleted',
        message: data.message,
        icon: '📅',
        priority: 'medium',
        ...data
      });
    });

    // System admin notifications
    this.socket.on('staff:created', (data) => {
      console.log('👥 Staff created notification:', data);
      this.emit('notification_received', {
        type: 'staff_created',
        title: 'New Staff Member',
        message: data.message,
        icon: '👥',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('user:updated', (data) => {
      console.log('👤 User updated notification:', data);
      this.emit('notification_received', {
        type: 'user_updated',
        title: 'User Updated',
        message: data.message,
        icon: '👤',
        priority: 'low',
        ...data
      });
    });

    this.socket.on('user:deleted', (data) => {
      console.log('👤 User deleted notification:', data);
      this.emit('notification_received', {
        type: 'user_deleted',
        title: 'User Deleted',
        message: data.message,
        icon: '👤',
        priority: 'medium',
        ...data
      });
    });

    this.socket.on('password:reset', (data) => {
      console.log('🔑 Password reset notification:', data);
      this.emit('notification_received', {
        type: 'password_reset',
        title: 'Password Reset',
        message: data.message,
        icon: '🔑',
        priority: 'high',
        ...data
      });
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Join a room
   * @param {string} room - Room name
   */
  joinRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join', room);
      console.log(`🏠 Joining room: ${room}`);
    }
  }

  /**
   * Leave a room
   * @param {string} room - Room name
   */
  leaveRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave', room);
      console.log(`🚪 Leaving room: ${room}`);
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get socket instance
   * @returns {object|null} Socket instance
   */
  getSocket() {
    return this.socket;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
