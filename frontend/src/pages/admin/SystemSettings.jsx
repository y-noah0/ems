import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';

const SystemSettings = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    examTimeLimit: 60,
    maxAttemptsAllowed: 3,
    enableAntiCheatingSystem: true,
    notificationEmail: '',
    maintenanceMode: false
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // This is a placeholder for actual API integration
    // In a real implementation, we would call an API to save the settings
    
    // For now, we just show a success message
    try {
      // Simulate API call
      setTimeout(() => {
        setSaved(true);
        setError('');
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setSaved(false);
        }, 3000);
      }, 500);    } catch {
      setError('Failed to save settings. Please try again.');
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex justify-center items-center py-5">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          You do not have permission to access this page
        </div>
      </div>
    );
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">System Settings</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {saved && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Settings saved successfully!
          </div>
        )}
      
        <div className="bg-white shadow-md rounded-lg mb-6">
          <div className="p-6">
            <h4 className="text-lg font-semibold mb-4">Exam Configuration</h4>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="examTimeLimit" className="block text-sm font-medium text-gray-700">
                  Default Exam Time Limit (minutes)
                </label>
                <input 
                  type="number" 
                  id="examTimeLimit"
                  name="examTimeLimit"
                  value={settings.examTimeLimit} 
                  onChange={handleChange}
                  min="5"
                  max="180"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">
                  This will be the default time limit for new exams.
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="maxAttemptsAllowed" className="block text-sm font-medium text-gray-700">
                  Maximum Attempts Allowed
                </label>
                <input 
                  type="number" 
                  id="maxAttemptsAllowed"
                  name="maxAttemptsAllowed"
                  value={settings.maxAttemptsAllowed} 
                  onChange={handleChange}
                  min="1"
                  max="10"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="mb-6 flex items-center">
                <input 
                  type="checkbox" 
                  id="enableAntiCheatingSystem" 
                  name="enableAntiCheatingSystem"
                  checked={settings.enableAntiCheatingSystem} 
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enableAntiCheatingSystem" className="ml-2 block text-sm text-gray-700">
                  Enable Anti-Cheating System
                </label>
              </div>
              
              <h4 className="text-lg font-semibold mb-4">System Configuration</h4>
              
              <div className="mb-4">
                <label htmlFor="notificationEmail" className="block text-sm font-medium text-gray-700">
                  Notification Email
                </label>
                <input 
                  type="email" 
                  id="notificationEmail"
                  name="notificationEmail"
                  value={settings.notificationEmail} 
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">
                  System alerts will be sent to this email address.
                </p>
              </div>
              
              <div className="mb-6 flex items-center">
                <input 
                  type="checkbox" 
                  id="maintenanceMode" 
                  name="maintenanceMode"
                  checked={settings.maintenanceMode} 
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700">
                  Maintenance Mode
                </label>
                <p className="mt-1 text-sm text-gray-500 ml-6">
                  When enabled, only administrators can access the system.
                </p>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg">
          <div className="p-6">
            <h4 className="text-lg font-semibold mb-4">Database Management</h4>
            <p className="text-sm text-gray-500 mb-4">
              These operations affect the entire system database. Use with caution.
            </p>
            
            <div className="flex flex-wrap gap-3 mt-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Backup Database
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-yellow-300 shadow-sm text-sm font-medium rounded-md text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                Clear Expired Sessions
              </button>
              <button 
                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white opacity-50 cursor-not-allowed"
                disabled
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemSettings;
