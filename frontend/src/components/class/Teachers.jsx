import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import teacherService from '../../services/teacherService';

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
    password: '',
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

  const fetchTeachers = async () => {
    if (!currentUser?.school) {
      setNotification({ type: 'error', message: 'No school associated with your account.' });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const teachers = await teacherService.fetchTeachers(currentUser.school);
      setTeachersData(teachers);
    } catch (error) {
      const errorMessage = error.errors
        ? error.errors.map(e => e.msg).join(', ')
        : error.message || 'Failed to fetch teachers.';
      console.error('Error fetching teachers:', errorMessage);
      setNotification({ type: 'error', message: errorMessage });
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
      setSchools([{ _id: '507f1f77bcf86cd799439011', name: 'Default School' }]);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setNotification({ type: 'error', message: 'Please log in to view teachers.' });
      return;
    }
    if (currentUser.school) {
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
    if (formData.phoneNumber && !/^\+?\d{10,15}$/.test(formData.phoneNumber))
      errors.phoneNumber = 'Invalid phone number format';
    if (!selectedTeacher && !formData.password) errors.password = 'Password is required';
    return errors;
  };

  const openModal = (teacher = null) => {
    setSelectedTeacher(teacher);
    setFormData(
      teacher
        ? { ...teacher, password: '' }
        : {
          role: 'teacher',
          fullName: '',
          email: '',
          phoneNumber: '',
          school: currentUser?.school || '',
          password: '',
          profilePicture: '',
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

    try {
      const payload = {
        role: formData.role,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        schoolId: currentUser.school, // Use currentUser.school
        password: formData.password,
        profilePicture: formData.profilePicture || null,
        preferences: formData.preferences,
        status: formData.status,
      };
      if (selectedTeacher) {
        await teacherService.api.put(`/teachers`, {
          ...payload,
          schoolId: currentUser.school,
          teacherId: selectedTeacher._id
        });
        setTeachersData(
          teachersData.map((t) =>
            t._id === selectedTeacher._id ? { ...payload, _id: selectedTeacher._id } : t
          )
        );
        setNotification({ type: 'success', message: 'Teacher updated successfully!' });
      } else {
        const response = await teacherService.register(payload);
        setTeachersData([...teachersData, response.user]);
        setNotification({ type: 'success', message: 'Teacher added successfully!' });
      }
      closeModal();
    } catch (error) {
      const errorMessage = error.errors
        ? error.errors.map(e => e.msg).join(', ')
        : error.message || 'Failed to save teacher.';
      console.error('Error saving teacher:', errorMessage);
      setNotification({ type: 'error', message: errorMessage });
    }
  };

  const handleDelete = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await teacherService.api.delete(`/teachers`, { data: { schoolId: currentUser.school, teacherId } });
        setTeachersData(teachersData.filter((t) => t._id !== teacherId));
        setNotification({ type: 'success', message: 'Teacher deleted successfully!' });
      } catch (error) {
        const errorMessage = error.errors
          ? error.errors.map(e => e.msg).join(', ')
          : error.message || 'Failed to delete teacher.';
        console.error('Error deleting teacher:', errorMessage);
        setNotification({ type: 'error', message: errorMessage });
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
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">
            Teacher Management
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search teachers..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search teachers"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200"
            >
              <Plus size={18} /> Add Teacher
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-2">Sort by:</label>
            <select
              className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
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
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-2">Order:</label>
            <select
              className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Sort order"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
            <select
              className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
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

        {notification && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white animate-slide-in ${notification.type === 'success' ? 'bg-blue-600' : 'bg-red-600'
              }`}
          >
            {notification.message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">No teachers match the current filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher._id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">{teacher.fullName}</h2>
                  <CheckCircle2
                    className={teacher.status === 'Active' ? 'text-emerald-500' : 'text-gray-400'}
                    size={20}
                  />
                </div>
                <div className="space-y-2">
                  <p><span className="font-medium text-gray-600">Name:</span> <span className="text-gray-700">{teacher.fullName}</span></p>
                  <p><span className="font-medium text-gray-600">Email:</span> <span className="text-gray-700">{teacher.email}</span></p>
                  <p><span className="font-medium text-gray-600">Phone:</span> <span className="text-gray-700">{teacher.phoneNumber}</span></p>
                  <p><span className="font-medium text-gray-600">School:</span> <span className="text-gray-700">{Array.isArray(schools) ? schools.find(s => s._id === teacher.school)?.name || 'Unknown' : 'Unknown'}</span></p>
                  <p><span className="font-medium text-gray-600">Status:</span> <span className={teacher.status === 'Active' ? 'text-emerald-500' : 'text-gray-500'}>{teacher.status}</span></p>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => openModal(teacher)}
                    className="text-emerald-500 hover:text-emerald-600 p-2 transform hover:scale-110 transition-all duration-200"
                    aria-label={`Edit ${teacher.fullName}`}
                    title="Edit"
                  >
                    <Pencil size={24} />
                  </button>
                  <button
                    onClick={() => handleDelete(teacher._id)}
                    className="text-red-500 hover:text-red-600 p-2 transform hover:scale-110 transition-all duration-200"
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
              <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
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
                <Dialog.Panel className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
                  <Dialog.Title className="text-xl font-bold text-gray-800 mb-4">
                    {selectedTeacher ? 'Edit Teacher' : 'Add Teacher'}
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Full Name"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 ${formErrors.fullName ? 'border-red-500' : ''
                          }`}
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        aria-label="Full name"
                        required
                      />
                      {formErrors.fullName && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.fullName}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 ${formErrors.email ? 'border-red-500' : ''
                          }`}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        aria-label="Email"
                        required
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Phone Number"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 ${formErrors.phoneNumber ? 'border-red-500' : ''
                          }`}
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, phoneNumber: e.target.value })
                        }
                        aria-label="Phone number"
                      />
                      {formErrors.phoneNumber && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.phoneNumber}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 ${formErrors.password ? 'border-red-500' : ''
                          }`}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        aria-label="Password"
                        required
                      />
                      {formErrors.password && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Profile Picture URL"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                        value={formData.profilePicture}
                        onChange={(e) =>
                          setFormData({ ...formData, profilePicture: e.target.value })
                        }
                        aria-label="Profile picture"
                      />
                    </div>
                    <div>
                      <select
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        aria-label="Status"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-all duration-200"
                        aria-label="Cancel"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                        aria-label={selectedTeacher ? 'Update teacher' : 'Add teacher'}
                      >
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
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-in;
                }
                .animate-slide-in {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>
    </div>
  );
};

export default TeacherManagement;