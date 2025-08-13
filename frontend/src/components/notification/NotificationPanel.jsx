import React, { useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';

// 360x640 panel with 12px font, black/10 borders + timestamp bottom-right
const NotificationPanel = ({ onClose }) => {
  const panelRef = useRef(null);
  let notifications = [];
  let removeNotification = () => {};
  let handleNotificationClick = () => {};
  try {
    const ctx = useNotifications();
    notifications = ctx.notifications;
    removeNotification = ctx.removeNotification;
    handleNotificationClick = ctx.handleNotificationClick;
  } catch {/* context not available */}

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div ref={panelRef} className="absolute -right-20 top-4 mt-2 w-[360px] min-h-[450px] max-h-full container flex flex-col z-50 px-5" style={{ fontSize: '14px' }}>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {notifications.length === 0 && <div className="text-center text-gray-500 mt-10">No notifications</div>}
        {notifications.map(n => (
          <div
            key={n.id}
            className="border border-black/10 rounded-md px-4 py-4 relative bg-white cursor-pointer hover:bg-gray-50 transition"
            onClick={() => handleNotificationClick(n)}
          >
            <button onClick={() => removeNotification(n.id)} className="absolute top-2 right-2 text-red-500 font-bold text-xs hover:text-red-600" aria-label="Remove notification">X</button>
            <div className="font-medium mb-2 pr-6 truncate">{n.title || 'Notification Type'}</div>
            <div className="text-gray-800 leading-relaxed break-words text-[12px]">{n.message || 'This is the notification body'}</div>
            <div className="mt-3 text-right text-[10px] text-gray-500">{formatTime(n.timestamp || n.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationPanel;
