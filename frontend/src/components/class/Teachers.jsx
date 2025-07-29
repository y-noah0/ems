import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';

// Dummy data for initial testing
const dummyTeachers = [
  { _id: '1', fullName: 'John Doe', email: 'john.doe@example.com', phone: '123-456-7890', regNo: 'T001', subjects: 'Math, Physics', status: 'Active' },
  { _id: '2', fullName: 'Jane Smith', email: 'jane.smith@example.com', phone: '234-567-8901', regNo: 'T002', subjects: 'English, Literature', status: 'Active' },
  { _id: '3', fullName: 'Emily Johnson', email: 'emily.j@example.com', phone: '345-678-9012', regNo: 'T003', subjects: 'Chemistry, Biology', status: 'Inactive' },
  { _id: '4', fullName: 'Michael Brown', email: 'michael.b@example.com', phone: '456-789-0123', regNo: 'T004', subjects: 'History, Geography', status: 'Active' },
];

const TeacherManagement = () => {
  const [teachersData, setTeachersData] = useState(dummyTeachers);
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    regNo: '',
    subjects: '',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('fullName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('All');
  const [notification, setNotification] = useState(null);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTeachersData(dummyTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setNotification({ type: 'error', message: 'Failed to fetch teachers.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
    if (formData.phone && !/^\d{3}-\d{3}-\d{4}$/.test(formData.phone))
      errors.phone = 'Phone must be in format 123-456-7890';
    if (!formData.regNo.trim()) errors.regNo = 'Registration number is required';
    return errors;
  };

  const openModal = (teacher = null) => {
    setSelectedTeacher(teacher);
    setFormData(
      teacher
        ? { ...teacher }
        : { fullName: '', email: '', phone: '', regNo: '', subjects: '', status: 'Active' }
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
      if (selectedTeacher) {
        setTeachersData(
          teachersData.map((t) =>
            t._id === selectedTeacher._id ? { ...formData, _id: selectedTeacher._id } : t
          )
        );
        setNotification({ type: 'success', message: 'Teacher updated successfully!' });
      } else {
        setTeachersData([...teachersData, { ...formData, _id: `${Date.now()}` }]);
        setNotification({ type: 'success', message: 'Teacher added successfully!' });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving teacher:', error);
      setNotification({ type: 'error', message: 'Failed to save teacher.' });
    }
  };

  const handleDelete = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        setTeachersData(teachersData.filter((t) => t._id !== teacherId));
        setNotification({ type: 'success', message: 'Teacher deleted successfully!' });
      } catch (error) {
        console.error('Error deleting teacher:', error);
        setNotification({ type: 'error', message: 'Failed to delete teacher.' });
      }
    }
  };

  const filteredTeachers = teachersData
    .filter(
      (teacher) =>
        (filterStatus === 'All' || teacher.status === filterStatus) &&
        (teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.subjects.toLowerCase().includes(searchTerm.toLowerCase()))
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
              <option value="regNo">Registration No</option>
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
                  <p><span className="font-medium text-gray-600">Phone:</span> <span className="text-gray-700">{teacher.phone}</span></p>
                  <p><span className="font-medium text-gray-600">Reg No:</span> <span className="text-gray-700">{teacher.regNo}</span></p>
                  <p><span className="font-medium text-gray-600">Subjects:</span> <span className="text-gray-700">{teacher.subjects}</span></p>
                  <p><span className="font-medium text-gray-600">Status:</span> <span className={teacher.status === 'Active' ? 'text-emerald-500' : 'text-gray-500'}>{teacher.status}</span></p>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => openModal(teacher)}
                    className="text-emerald-500 hover:text-emerald-600 transform hover:scale-110 transition-all duration-200"
                    aria-label={`Edit ${teacher.fullName}`}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(teacher._id)}
                    className="text-red-500 hover:text-red-600 transform hover:scale-110 transition-all duration-200"
                    aria-label={`Delete ${teacher.fullName}`}
                    title="Delete"
                  >
                    <Trash2 size={16} />
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
                        placeholder="Phone (123-456-7890)"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 ${formErrors.phone ? 'border-red-500' : ''
                          }`}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        aria-label="Phone number"
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Registration Number"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 ${formErrors.regNo ? 'border-red-500' : ''
                          }`}
                        value={formData.regNo}
                        onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                        aria-label="Registration number"
                        required
                      />
                      {formErrors.regNo && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.regNo}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Subjects (comma-separated)"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                        value={formData.subjects}
                        onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                        aria-label="Subjects"
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