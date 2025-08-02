import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HeadmasterForm from '../../components/forms/HeadmasterForm';
import userService from '../../services/userService';
import { ToastContext } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Layout from '../../components/layout/Layout';

export default function HeadmasterManagement() {
  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);
  
  const [headmasters, setHeadmasters] = useState([]);
  const [filteredHeadmasters, setFilteredHeadmasters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHeadmaster, setEditingHeadmaster] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchHeadmasters = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await userService.getHeadmasters();
      setHeadmasters(data);
      setFilteredHeadmasters(data);
    } catch (error) {
      showToast(`Failed to fetch headmasters: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchHeadmasters();
  }, [fetchHeadmasters]);

  const handleAddHeadmaster = () => {
    setEditingHeadmaster(null);
    setShowForm(true);
  };

  const handleEditHeadmaster = (headmaster) => {
    setEditingHeadmaster(headmaster);
    setShowForm(true);
  };

  const handleDeleteHeadmaster = async (headmasterId) => {
    if (window.confirm('Are you sure you want to delete this headmaster? This action cannot be undone.')) {
      try {
        setDeletingId(headmasterId);
        await userService.deleteUser(headmasterId);
        showToast('Headmaster deleted successfully', 'success');
        fetchHeadmasters();
      } catch (error) {
        showToast(`Failed to delete headmaster: ${error.message}`, 'error');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingHeadmaster(null);
  };

  const handleHeadmasterCreated = () => {
    fetchHeadmasters();
  };

  const handleHeadmasterUpdated = () => {
    fetchHeadmasters();
  };

  return (
    <Layout>
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
          </div>
          {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search headmasters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-64 placeholder:text-sm text-sm"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

          
          <div className="flex items-center space-x-4">
            
            {/* Add Headmaster Button */}
            <Button
              onClick={handleAddHeadmaster}
              size='sm'
              variant="primary"
            >
              Add Headmaster
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading headmasters...</span>
            </div>
          ) : filteredHeadmasters.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No headmasters found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new headmaster.'}
              </p>
              
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Headmaster Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHeadmasters.map((headmaster) => (
                  <tr key={headmaster._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {headmaster.fullName?.charAt(0)?.toUpperCase() || 'H'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {headmaster.fullName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {headmaster.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {headmaster.phoneNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {headmaster.schoolId?.name || 'No school assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditHeadmaster(headmaster)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteHeadmaster(headmaster._id)}
                          disabled={deletingId === headmaster._id}
                          className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                        >
                          {deletingId === headmaster._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <HeadmasterForm
            headmasterId={editingHeadmaster?._id}
            onClose={handleFormClose}
            onCreate={handleHeadmasterCreated}
            onUpdate={handleHeadmasterUpdated}
          />
        )}
      </div>
    </Layout>
  );
}
