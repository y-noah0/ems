import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [error] = useState('');

  useEffect(() => {
    // Verify user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="flex justify-center items-center py-5">Loading...</div>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-center text-2xl font-bold mb-6">System Administration Dashboard</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-full">
            <div className="p-6 flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-2">User Management</h2>
              <p className="text-gray-600 mb-6 flex-grow">
                Manage all teachers, administrators, and deans. Create new accounts, update credentials, or remove users.
              </p>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                onClick={() => navigate('/admin/users')}
              >
                Manage Users
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-full">
            <div className="p-6 flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-2">System Settings</h2>
              <p className="text-gray-600 mb-6 flex-grow">
                Configure system-wide settings and parameters.
              </p>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                onClick={() => navigate('/admin/settings')}
              >
                System Settings
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-full">
            <div className="p-6 flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-2">System Logs</h2>
              <p className="text-gray-600 mb-6 flex-grow">
                View system activity logs and user actions.
              </p>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                onClick={() => navigate('/admin/logs')}
              >
                View Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
