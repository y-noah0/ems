import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';

const SystemLogs = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    type: 'all',
    startDate: '',
    endDate: '',
    user: ''
  });

  // Sample log data for UI demonstration
  // In a real app, this would come from an API
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Sample logs data
        const sampleLogs = [
          {
            id: 1,
            timestamp: '2025-05-30T10:15:32Z',
            type: 'auth',
            action: 'login',
            user: 'john.doe@example.com',
            details: 'Successful login from IP 192.168.1.105',
            severity: 'info'
          },
          {
            id: 2,
            timestamp: '2025-05-30T09:42:17Z',
            type: 'admin',
            action: 'user_create',
            user: 'admin@example.com',
            details: 'Created new user: teacher3@example.com with role: teacher',
            severity: 'info'
          },
          {
            id: 3,
            timestamp: '2025-05-30T08:17:45Z',
            type: 'auth',
            action: 'password_reset',
            user: 'admin@example.com',
            details: 'Reset password for user: teacher1@example.com',
            severity: 'warning'
          },
          {
            id: 4,
            timestamp: '2025-05-29T16:22:10Z',
            type: 'system',
            action: 'backup',
            user: 'system',
            details: 'Automated daily backup completed successfully',
            severity: 'info'
          },
          {
            id: 5,
            timestamp: '2025-05-29T14:35:08Z',
            type: 'exam',
            action: 'create',
            user: 'teacher2@example.com',
            details: 'Created new exam: Final Mathematics Exam',
            severity: 'info'
          },
          {
            id: 6,
            timestamp: '2025-05-29T11:08:52Z',
            type: 'auth',
            action: 'login_failed',
            user: 'unknown',
            details: 'Failed login attempt for user: student22@example.com from IP 203.0.113.45',
            severity: 'error'
          },
          {
            id: 7,
            timestamp: '2025-05-28T16:42:30Z',
            type: 'admin',
            action: 'user_delete',
            user: 'admin@example.com',
            details: 'Deleted user: former_teacher@example.com',
            severity: 'warning'
          }
        ];
        
        setLogs(sampleLogs);      } catch {
        setError('Failed to load system logs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({
      ...filter,
      [name]: value
    });
  };

  const applyFilters = () => {
    // This would typically be an API call with filter params
    // For demo purposes, we're just showing a loading state
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const resetFilters = () => {
    setFilter({
      type: 'all',
      startDate: '',
      endDate: '',
      user: ''
    });
  };

  // Get badge color based on log severity
  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'bg-red-600';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
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
        <h1 className="text-2xl font-bold mb-6">System Activity Logs</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      
        <div className="bg-white shadow-md rounded-lg mb-6">
          <div className="p-6">
            <h5 className="text-lg font-medium mb-4">Filter Logs</h5>
            <form>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="mb-3">
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Log Type
                  </label>
                  <select 
                    id="type"
                    name="type" 
                    value={filter.type}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="auth">Authentication</option>
                    <option value="admin">Administration</option>
                    <option value="exam">Exam Management</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input 
                    type="date" 
                    id="startDate"
                    name="startDate" 
                    value={filter.startDate}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input 
                    type="date" 
                    id="endDate"
                    name="endDate" 
                    value={filter.endDate}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
                    User
                  </label>
                  <input 
                    type="text" 
                    id="user"
                    name="user" 
                    value={filter.user}
                    onChange={handleFilterChange}
                    placeholder="Email or username"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-2">
                <button 
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Apply Filters
                </button>
                <button 
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="font-medium">{logs.length}</span> logs found
              </div>
              <div>
                <button 
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Export Logs
                </button>
              </div>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.user}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.details}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`${getSeverityBadgeColor(log.severity)} text-white text-xs px-2.5 py-0.5 rounded-full`}>
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                          No logs found matching your criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default SystemLogs;
