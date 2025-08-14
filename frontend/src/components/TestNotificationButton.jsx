import React from 'react';
import { useNotifications } from '../context/NotificationContext';

const TestNotificationButton = () => {
  const { addNotification, isConnected } = useNotifications();

  const sendTestNotification = () => {
    addNotification({
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification from the frontend!',
      icon: '🧪',
      priority: 'high'
    });
  };

  const sendExamNotification = () => {
    addNotification({
      type: 'exam_scheduled',
      title: 'New Exam Scheduled',
      message: 'Mathematics exam has been scheduled for tomorrow at 9 AM',
      icon: '📅',
      priority: 'high',
      examId: '123' // This would be a real exam ID
    });
  };

  const sendGradeNotification = () => {
    addNotification({
      type: 'submission_graded',
      title: 'Grade Available',
      message: 'Your Physics assignment has been graded. Score: 85/100',
      icon: '🎯',
      priority: 'high',
      submissionId: '456' // This would be a real submission ID
    });
  };

  return (
    <div className="test-notification-buttons" style={{ 
      position: 'fixed', 
      bottom: '20px', 
      left: '20px', 
      zIndex: 1000,
      background: 'white',
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ marginBottom: '10px', fontSize: '12px' }}>
        <strong>Test Notifications</strong><br />
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button 
          onClick={sendTestNotification}
          style={{ 
            padding: '5px 10px', 
            fontSize: '12px', 
            cursor: 'pointer',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Test Notification
        </button>
        <button 
          onClick={sendExamNotification}
          style={{ 
            padding: '5px 10px', 
            fontSize: '12px', 
            cursor: 'pointer',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Test Exam Notification
        </button>
        <button 
          onClick={sendGradeNotification}
          style={{ 
            padding: '5px 10px', 
            fontSize: '12px', 
            cursor: 'pointer',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Test Grade Notification
        </button>
      </div>
    </div>
  );
};

export default TestNotificationButton;
