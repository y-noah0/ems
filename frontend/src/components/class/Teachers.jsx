import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, CheckCircle2, ArrowLeft, User, Mail, Phone, AreaChart } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import teacherService from '../../services/teacherService';
import TeacherManagementTableNew from './teacherMgt';
import TeacherPerformanceBarChart from './teacherPerfomance';

const TeacherManagement = () => {
  const { currentUser } = useAuth();
  const [teachersData, setTeachersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    role: 'teacher',
    fullName: '',
    email: '',
    phoneNumber: '',
    preferences: { notifications: { email: true, sms: false }, theme: 'light' },
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('fullName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('All');
  const [schools, setSchools] = useState([]);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards', 'table', or 'chart'

  const fetchTeachers = async () => {
    if (!currentUser?.school || loading) {
      if (!currentUser?.school) {
        setNotification({ type: 'error', message: 'No school associated with your account.' });
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const teachers = await teacherService.fetchTeachers(currentUser.school);
      setTeachersData(Array.isArray(teachers) ? teachers : []);
    } catch (error) {
      const errorMessage = error.errors
        ? error.errors.map((e) => e.msg).join(', ')
        : error.message || 'Failed to fetch teachers.';
      console.error('Error fetching teachers:', errorMessage);
      setNotification({ type: 'error', message: errorMessage });
      setTeachersData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const schoolsData = await teacherService.fetchSchools();
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
    } catch (error) {
      console.error('Error fetching schools:', error.message);
      setSchools([]);
      setNotification({ type: 'error', message: 'Failed to fetch schools.' });
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setNotification({ type: 'error', message: 'Please log in to view teachers.' });
      setTeachersData([]);
      return;
    }
    if (currentUser.school && !loading) {
      fetchTeachers();
      fetchSchools();
    }
  }, [currentUser]);

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(formData.email))
      errors.email = 'Invalid email format';
    if (formData.phoneNumber && !/^\+250[1-9]\d{8}$/.test(formData.phoneNumber))
      errors.phoneNumber =
        'Phone number must start with +250 followed by 9 digits, no leading zero';
    if (selectedTeacher && formData.password && formData.password.length < 6)
      errors.password = 'Password must be at least 6 characters';
    return errors;
  };

  const openModal = (teacher = null) => {
    setSelectedTeacher(teacher);
    setFormData(
      teacher
        ? { ...teacher, password: '', phoneNumber: teacher.phoneNumber || '' }
        : {
          role: 'teacher',
          fullName: '',
          email: '',
          phoneNumber: '',
          preferences: { notifications: { email: true, sms: false }, theme: 'light' },
          status: 'Active',
        }
    );
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTeacher(null);
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: formData.role,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber || null,
        schoolId: currentUser.school,
        preferences: formData.preferences,
        status: formData.status,
        isDeleted: formData.status === 'Inactive',
      };

      if (selectedTeacher && formData.password) {
        payload.password = formData.password;
      }

      if (selectedTeacher) {
        await teacherService.updateTeacher({
          ...payload,
          teacherId: selectedTeacher._id,
        });
        setNotification({ type: 'success', message: 'Teacher updated successfully!' });
      } else {
        await teacherService.register(payload);
        setNotification({ type: 'success', message: 'Teacher added successfully!' });
      }

      await fetchTeachers();
      closeModal();
    } catch (error) {
      const errorMessage = error.errors
        ? error.errors.map((e) => e.msg).join(', ')
        : error.message || 'Failed to save teacher.';
      console.error('Error saving teacher:', errorMessage);
      setNotification({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      setLoading(true);
      try {
        await teacherService.deleteTeacher({ schoolId: currentUser.school, teacherId });
        setNotification({ type: 'success', message: 'Teacher deleted successfully!' });
        await fetchTeachers();
      } catch (error) {
        const errorMessage = error.errors
          ? error.errors.map((e) => e.msg).join(', ')
          : error.message || 'Failed to delete teacher.';
        console.error('Error deleting teacher:', errorMessage);
        setNotification({ type: 'error', message: errorMessage });
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredTeachers = teachersData
    .filter(
      (teacher) =>
        (filterStatus === 'All' || teacher.status === filterStatus) &&
        (teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.phoneNumber?.toString().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const fieldA = a[sortField]?.toString().toLowerCase() || '';
      const fieldB = b[sortField]?.toString().toLowerCase() || '';
      return sortOrder === 'asc'
        ? fieldA.localeCompare(fieldB)
        : fieldB.localeCompare(fieldA);
    });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-semibold text-gray-900 mb-4 sm:mb-0 tracking-tight">
            Teacher Management
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {viewMode !== 'chart' && (
              <div className="relative w-full sm:w-72 group">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors duration-200"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search teachers"
                />
              </div>
            )}
            <button
              onClick={() => setViewMode('chart')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <AreaChart size={20} /> X
            </button>
            {viewMode === 'chart' ? (
              <button
                onClick={() => setViewMode('cards')}
                className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <ArrowLeft size={20} /> Back to Teachers
              </button>
            ) : (
              <>
                <button
                  onClick={() => setViewMode('table')}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <User size={20} /> Management
                </button>
                <button
                  onClick={() => openModal()}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Plus size={20} /> Add Teacher
                </button>
              </>
            )}
          </div>
        </div>

        {viewMode !== 'chart' && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white p-5 rounded-xl shadow-lg">
            <div className="flex items-center group">
              <label className="text-sm font-semibold text-gray-700 mr-2">Sort by:</label>
              <select
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:shadow-md"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                aria-label="Sort by"
              >
                <option value="fullName">Name</option>
                <option value="email">Email</option>
                <option value="phoneNumber">Phone</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div className="flex items-center group">
              <label className="text-sm font-semibold text-gray-700 mr-2">Order:</label>
              <select
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:shadow-md"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                aria-label="Sort order"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <div className="flex items-center group">
              <label className="text-sm font-semibold text-gray-700 mr-2">Status:</label>
              <select
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:shadow-md"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {notification && (
          <div
            className={`fixed top-4 right-4 px-5 py-3 rounded-lg shadow-xl text-white animate-slide-in flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}
          >
            <CheckCircle2 size={20} />
            {notification.message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          </div>
        ) : viewMode === 'chart' ? (
          <TeacherPerformanceBarChart />
        ) : viewMode === 'table' ? (
          <TeacherManagementTableNew
            teachers={filteredTeachers}
            onEdit={openModal}
            onDelete={handleDelete}
          />
        ) : filteredTeachers.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8 text-lg">
            No teachers match the current filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher._id}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 tracking-tight">
                    {teacher.fullName}
                  </h2>
                  <CheckCircle2
                    className={`${!teacher.isDeleted ? 'text-green-500' : 'text-red-400'} animate-pulse`}
                    size={32}
                  />
                </div>
                <div className="space-y-3">
                  <p className="flex items-start gap-2">
                    <User className="text-blue-500 mt-1" size={20} />
                    <span>
                      <span className="font-medium text-gray-600">Name:</span>{' '}
                      <span className="text-gray-700">{teacher.fullName}</span>
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Mail className="text-blue-500 mt-1" size={20} />
                    <span>
                      <span className="font-medium text-gray-600">Email:</span>{' '}
                      <span className="text-gray-700">{teacher.email}</span>
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Phone className="text-blue-500 mt-1" size={20} />
                    <span>
                      <span className="font-medium text-gray-600">Phone:</span>{' '}
                      <span className="text-gray-700">{teacher.phoneNumber || 'Not provided'}</span>
                    </span>
                  </p>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={() => openModal(teacher)}
                    className="text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-100 transform hover:scale-110 transition-all duration-200"
                    aria-label={`Edit ${teacher.fullName}`}
                    title="Edit"
                  >
                    <User size={24} />
                  </button>
                  <button
                    onClick={() => handleDelete(teacher._id)}
                    className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-100 transform hover:scale-110 transition-all duration-200"
                    aria-label={`Delete ${teacher.fullName}`}
                    title="Delete"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Transition show={isModalOpen} as={React.Fragment}>
          <Dialog as="div" className="relative z-50" onClose={closeModal}>
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            </Transition.Child>
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 transform transition-all animate-slide-up">
                  <Dialog.Title className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <User className="text-blue-500 animate-pulse" size={24} />
                    {selectedTeacher ? 'Edit Teacher' : 'Add Teacher'}
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                      <div className="flex items-center gap-3">
                        <User className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                        <input
                          type="text"
                          placeholder="Full Name"
                          className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${formErrors.fullName ? 'border-red-500' : ''
                            }`}
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          aria-label="Full name"
                          required
                        />
                      </div>
                      {formErrors.fullName && (
                        <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">
                          {formErrors.fullName}
                        </p>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="flex items-center gap-3">
                        <Mail className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                        <input
                          type="email"
                          placeholder="Email"
                          className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${formErrors.email ? 'border-red-500' : ''
                            }`}
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          aria-label="Email"
                          required
                        />
                      </div>
                      {formErrors.email && (
                        <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="flex items-center gap-3">
                        <Phone className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                        <div className="flex w-full">
                          <span className="inline-flex items-center px-4 py-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-700 text-sm font-medium">
                            +250
                          </span>
                          <input
                            type="tel"
                            placeholder="78.....888"
                            className={`w-full px-4 py-3 rounded-r-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${formErrors.phoneNumber ? 'border-red-500' : ''
                              }`}
                            value={formData.phoneNumber.replace(/^\+250/, '')}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '');
                              if (digits.length <= 9) {
                                setFormData({
                                  ...formData,
                                  phoneNumber: digits ? `+250${digits}` : '',
                                });
                              }
                            }}
                            aria-label="Phone number"
                            pattern="[1-9]\d{8}"
                            title="Phone number must be 9 digits starting with 1-9 (e.g., 798725288)"
                          />
                        </div>
                      </div>
                      {formErrors.phoneNumber && (
                        <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">
                          {formErrors.phoneNumber}
                        </p>
                      )}
                    </div>
                    {selectedTeacher && (
                      <div className="relative group">
                        <div className="flex items-center gap-3">
                          <User className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                          <input
                            type="password"
                            placeholder="New Password (optional)"
                            className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${formErrors.password ? 'border-red-500' : ''
                              }`}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            aria-label="Password"
                          />
                        </div>
                        {formErrors.password && (
                          <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">
                            {formErrors.password}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="relative group">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                        <select
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          aria-label="Status"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-5 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300"
                        aria-label="Cancel"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className={`px-5 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        aria-label={selectedTeacher ? 'Update teacher' : 'Add teacher'}
                      >
                        <Plus size={20} />
                        {selectedTeacher ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-slide-in {
          animation: slideIn 0.4s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TeacherManagement;