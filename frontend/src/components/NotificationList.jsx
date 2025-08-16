import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationList.css';

const NotificationList = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(null);
  const dropdownRef = useRef(null); // wraps bell + dropdown
  const bellRef = useRef(null);
  
  const {
    notifications,
    unreadCount,
    isConnected,
    connectionError,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    handleNotificationClick
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRef.current) return;
      const clickedInside = dropdownRef.current.contains(event.target) || bellRef.current?.contains(event.target);
      if (!clickedInside) {
        if (isOpen) {
          // Debug: closing because outside click
          console.log('[NotificationList] Outside click detected – closing dropdown');
        }
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Show toast for new notifications
  useEffect(() => {
    if (notifications.length > 0 && !notifications[0].read) {
      const latestNotification = notifications[0];
      setShowToast(latestNotification);
      console.log('[NotificationList] Toast show for notification id', latestNotification.id);
      const timer = setTimeout(() => setShowToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Fallback listener for custom event emitted in context (ensures toast even if list not yet mounted)
  useEffect(() => {
    const handler = (e) => {
      const n = e.detail;
      setShowToast(n);
      console.log('[NotificationList] Fallback toast via custom event', n);
      const t = setTimeout(() => setShowToast(null), 5000);
      return () => clearTimeout(t);
    };
    window.addEventListener('app:new-notification', handler);
    return () => window.removeEventListener('app:new-notification', handler);
  }, []);

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'notification-high';
      case 'medium': return 'notification-medium';
      case 'low': return 'notification-low';
      default: return '';
    }
  };

  const getConnectionStatusIcon = () => {
    if (connectionError) return '🔴';
    return isConnected ? '🟢' : '🟡';
  };

  const handleNotificationItemClick = (notification) => {
    handleNotificationClick(notification);
    setIsOpen(false);
  };

  const handleRemoveNotification = (e, notificationId) => {
    e.stopPropagation();
    removeNotification(notificationId);
  };

  return (
    <div className="notification-container">
      {/* Toast Notification */}
      {showToast && (
        <div className={`notification-toast ${getPriorityClass(showToast.priority)}`}>
          <div className="toast-icon">{showToast.icon}</div>
          <div className="toast-content">
            <div className="toast-title">{showToast.title}</div>
            <div className="toast-message">{showToast.message}</div>
          </div>
          <button 
            className="toast-close"
            onClick={() => setShowToast(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Notification Bell */}
      <div className="notification-list" ref={dropdownRef}>
        <button
          ref={bellRef}
          className="notification-bell"
          onClick={() => {
            setIsOpen(prev => !prev);
            console.log('[NotificationList] Toggle dropdown ->', !isOpen, 'current notifications:', notifications.length);
          }}
          aria-label="Notifications"
          title={`${unreadCount} unread notifications`}
        >
          <span className="bell-icon">🔔</span>
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="connection-status" title={
            connectionError ? `Connection error: ${connectionError}` :
            isConnected ? 'Connected' : 'Connecting...'
          }>
            {getConnectionStatusIcon()}
          </span>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>Notifications</h3>
              <div className="header-actions">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="mark-all-read"
                    title="Mark all as read"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={clearAllNotifications}
                  className="clear-all"
                  title="Clear all notifications"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Connection Status */}
            {(connectionError || !isConnected) && (
              <div className="connection-warning">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">
                  {connectionError || 'Connecting to server...'}
                </span>
              </div>
            )}

            {/* Notification List */}
            <div className="notification-list-container">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  <div className="no-notifications-icon">📭</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
                    onClick={() => handleNotificationItemClick(notification)}
                  >
                    <div className="notification-icon">
                      {notification.icon}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">
                        {notification.title}
                        {notification.type === 'review_request' && (
                          <span className="ml-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 animate-pulse">
                            REVIEW
                          </span>
                        )}
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-time">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                    <div className="notification-actions">
                      {!notification.read && <div className="unread-dot"></div>}
                      <button
                        className="remove-notification"
                        onClick={(e) => handleRemoveNotification(e, notification.id)}
                        aria-label="Remove notification"
                        title="Remove notification"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 10 && (
              <div className="notification-footer">
                <div className="footer-text">
                  Showing latest {Math.min(notifications.length, 100)} notifications
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationList;
