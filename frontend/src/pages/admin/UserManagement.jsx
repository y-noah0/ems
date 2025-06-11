import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import systemAdminService from '../../services/systemAdminService';

const UserManagement = () => {
  const { currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'teacher',
  });
  const [newPassword, setNewPassword] = useState('');

  // Load all staff members
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const response = await systemAdminService.getAllStaff();
        setStaff(response.staff);
      } catch (err) {
        setError(err.message || 'Failed to load staff members');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle create staff member
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await systemAdminService.createStaff(formData);
      
      // Refresh staff list
      const response = await systemAdminService.getAllStaff();
      setStaff(response.staff);
      
      // Close modal and reset form
      setShowCreateModal(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'teacher',
      });
      
    } catch (err) {
      setError(err.message || 'Failed to create staff member');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    });
    setShowEditModal(true);
  };

  // Handle update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await systemAdminService.updateUser(selectedUser._id, {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
      });
      
      // Refresh staff list
      const response = await systemAdminService.getAllStaff();
      setStaff(response.staff);
      
      // Close modal
      setShowEditModal(false);
      
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await systemAdminService.deleteUser(selectedUser._id);
      
      // Update staff list by removing the deleted user
      setStaff(staff.filter(user => user._id !== selectedUser._id));
      
      // Close modal
      setShowDeleteModal(false);
      
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Handle reset password
  const handleResetPasswordClick = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordConfirm = async () => {
    try {
      setLoading(true);
      await systemAdminService.resetPassword(selectedUser._id, newPassword);
      
      // Close modal
      setShowResetPasswordModal(false);
      setNewPassword('');
      setError('');
      
      // Show success message
      alert(`Password for ${selectedUser.fullName} has been reset successfully`);
      
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Get badge color based on role
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600';
      case 'dean':
        return 'bg-yellow-500';
      case 'teacher':
        return 'bg-blue-600';
      default:
        return 'bg-gray-500';
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <button 
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
            onClick={() => setShowCreateModal(true)}
          >
            Add New Staff Member
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && !staff.length ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staff.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{user.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`${getRoleBadgeColor(user.role)} text-white text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        className="text-blue-600 hover:text-blue-900 mr-2 font-medium text-sm"
                        onClick={() => handleEditUser(user)}
                      >
                        Edit
                      </button>
                      <button 
                        className="text-yellow-600 hover:text-yellow-900 mr-2 font-medium text-sm"
                        onClick={() => handleResetPasswordClick(user)}
                      >
                        Reset Password
                      </button>
                      <button 
                        className={`text-red-600 hover:text-red-900 font-medium text-sm ${user._id === currentUser.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleDeleteClick(user)}
                        disabled={user._id === currentUser.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                      No staff members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Staff Modal */}
        {showCreateModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Add New Staff Member</h3>
                  <form onSubmit={handleCreateStaff}>
                    <div className="mb-4">
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        id="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        id="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        name="role"
                        id="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="teacher">Teacher</option>
                        <option value="dean">Dean</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loading ? 'Creating...' : 'Create User'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit User</h3>
                  <form onSubmit={handleUpdateUser}>
                    <div className="mb-4">
                      <label htmlFor="edit-fullName" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        id="edit-fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="edit-email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        name="role"
                        id="edit-role"
                        value={formData.role}
                        onChange={handleChange}
                        disabled={selectedUser && selectedUser._id === currentUser.id}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="teacher">Teacher</option>
                        <option value="dean">Dean</option>
                        <option value="admin">Admin</option>
                      </select>
                      {selectedUser && selectedUser._id === currentUser.id && (
                        <p className="mt-1 text-sm text-gray-500">
                          You cannot change your own role
                        </p>
                      )}
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loading ? 'Updating...' : 'Update User'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {showDeleteModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">Delete User</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete {selectedUser?.fullName}? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleDeleteConfirm}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetPasswordModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Reset Password</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-3">
                      Enter a new password for {selectedUser?.fullName}:
                    </p>
                    <div>
                      <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    disabled={loading || newPassword.length < 6}
                    onClick={handleResetPasswordConfirm}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-500 text-base font-medium text-white hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm ${(loading || newPassword.length < 6) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserManagement;
