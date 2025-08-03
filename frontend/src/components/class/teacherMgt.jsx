import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { FiEdit, FiUser, FiMail, FiPhoneCall, FiSearch, FiArrowLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import teacherService from '../../services/teacherService';
import CourseManagement from './coursesManagement';

const TeacherManagementTableNew = () => {
    const { currentUser } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [filters, setFilters] = useState({ course: '', access: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [showCourseManagement, setShowCourseManagement] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [formData, setFormData] = useState({
        names: '',
        email: '',
        phone: '',
        assignedCourses: '',
        status: 'Active',
        isDeleted: false,
    });
    const [formErrors, setFormErrors] = useState({});

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
            setData(
                Array.isArray(teachers)
                    ? teachers.map((teacher) => ({
                        _id: teacher._id,
                        names: teacher.fullName,
                        email: teacher.email,
                        phone: teacher.phoneNumber || 'Not provided',
                        assignedCourses: teacher.assignedCourses || '',
                        lastLogin: teacher.lastLogin || 'N/A',
                        isDeleted: teacher.isDeleted || false,
                    }))
                    : []
            );
        } catch (error) {
            const errorMessage = error.errors
                ? error.errors.map((e) => e.msg).join(', ')
                : error.message || 'Failed to fetch teachers.';
            console.error('Error fetching teachers:', errorMessage);
            setNotification({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUser) {
            setNotification({ type: 'error', message: 'Please log in to view teachers.' });
            return;
        }
        if (currentUser.school && !loading) {
            fetchTeachers();
        }
    }, [currentUser]);

    const validateForm = () => {
        const errors = {};
        if (!formData.names.trim()) errors.names = 'Full name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(formData.email))
            errors.email = 'Invalid email format';
        if (formData.phone && !/^\+250[1-9]\d{8}$/.test(formData.phone))
            errors.phone = 'Phone number must start with +250 followed by 9 digits, no leading zero';
        return errors;
    };

    const openModal = (teacher = null) => {
        setSelectedTeacher(teacher);
        setFormData(
            teacher
                ? {
                    names: teacher.names,
                    email: teacher.email,
                    phone: teacher.phone || '',
                    assignedCourses: teacher.assignedCourses || '',
                    status: teacher.isDeleted ? 'Inactive' : 'Active',
                    isDeleted: teacher.isDeleted,
                }
                : {
                    names: '',
                    email: '',
                    phone: '',
                    assignedCourses: '',
                    status: 'Active',
                    isDeleted: false,
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
                fullName: formData.names,
                email: formData.email,
                phoneNumber: formData.phone || null,
                schoolId: currentUser.school,
                assignedCourses: formData.assignedCourses || null,
                status: formData.status,
                isDeleted: formData.status === 'Inactive',
            };
            if (selectedTeacher) {
                const response = await teacherService.updateTeacher({
                    ...payload,
                    teacherId: selectedTeacher._id,
                });
                setData(
                    data.map((t) =>
                        t._id === selectedTeacher._id
                            ? {
                                ...t,
                                names: payload.fullName,
                                email: payload.email,
                                phone: payload.phoneNumber || 'Not provided',
                                assignedCourses: payload.assignedCourses || '',
                                isDeleted: payload.isDeleted,
                            }
                            : t
                    )
                );
                setNotification({ type: 'success', message: 'Teacher updated successfully!' });
            }
            closeModal();
        } catch (error) {
            const errorMessage = error.errors
                ? error.errors.map((e) => e.msg).join(', ')
                : error.message || 'Failed to update teacher.';
            console.error('Error updating teacher:', errorMessage);
            setNotification({ type: 'error', message: errorMessage });
        }
    };

    const handleToggle = (index) => {
        const newData = [...data];
        if (!newData[index].isDeleted) {
            newData[index].isDeleted = !newData[index].isDeleted;
            setData(newData);
            teacherService
                .updateTeacher({
                    teacherId: newData[index]._id,
                    schoolId: currentUser.school,
                    isDeleted: newData[index].isDeleted,
                })
                .then(() => {
                    setNotification({ type: 'success', message: 'Access updated successfully!' });
                })
                .catch((error) => {
                    const errorMessage = error.errors
                        ? error.errors.map((e) => e.msg).join(', ')
                        : error.message || 'Failed to update access.';
                    setNotification({ type: 'error', message: errorMessage });
                });
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters({ ...filters, [field]: value });
    };

    const filteredData = useMemo(() => {
        return data.filter((row) => {
            const matchesSearch =
                row.names.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.phone.includes(searchQuery);
            const matchesCourse = filters.course ? row.assignedCourses === filters.course : true;
            const matchesAccess =
                filters.access === ''
                    ? true
                    : filters.access === 'true'
                        ? !row.isDeleted
                        : row.isDeleted;
            return matchesSearch && matchesCourse && matchesAccess;
        });
    }, [data, filters, searchQuery]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-white to-gray-50">
            {notification && (
                <div
                    className={`fixed top-4 right-4 px-5 py-3 rounded-lg shadow-xl text-white animate-slide-in flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                        }`}
                >
                    {notification.type === 'success' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                    {notification.message}
                </div>
            )}

            {showCourseManagement ? (
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <FiUser className="text-blue-500" /> Course Management
                        </h2>
                        <button
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200 flex items-center gap-2"
                            onClick={() => setShowCourseManagement(false)}
                        >
                            <FiArrowLeft size={18} />
                            Back to Teachers Control Room
                        </button>
                    </div>
                    <CourseManagement />
                </div>
            ) : (
                <>
                    <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                        <FiUser className="text-blue-500" /> Teachers Control Room
                    </h2>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex flex-wrap gap-4 items-center">
                            <select
                                value={filters.course}
                                onChange={(e) => handleFilterChange('course', e.target.value)}
                                className="p-2 border rounded bg-white text-sm focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">All Courses</option>
                                <option value="Math">Math</option>
                                <option value="Science">Science</option>
                                <option value="History">History</option>
                            </select>
                            <select
                                value={filters.access}
                                onChange={(e) => handleFilterChange('access', e.target.value)}
                                className="p-2 border rounded bg-white text-sm focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">All Access</option>
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search Teachers..."
                                    className="w-full pl-10 pr-4 py-2 border rounded bg-white text-sm focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            <button
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
                                onClick={() => setShowCourseManagement(true)}
                            >
                                Course Management
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <p className="text-gray-500 italic text-center py-8 text-lg">
                            No teachers match the current filters.
                        </p>
                    ) : (
                        <div className="overflow-x-auto shadow-xl rounded-xl bg-white border border-gray-200">
                            <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {['Name', 'Email', 'Phone', 'Assigned', 'Last Login', 'Access', 'Actions'].map((header, index) => (
                                            <th
                                                key={index}
                                                className="p-4 text-left text-gray-600 text-sm font-semibold border-b border-r border-gray-300"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {filteredData.map((row, index) => (
                                            <motion.tr
                                                key={row._id}
                                                className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <td className="p-4 text-left">
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <FiUser className="text-blue-500" />
                                                        {row.names}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-left text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <FiMail className="text-purple-400" />
                                                        {row.email}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-left text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <FiPhoneCall className="text-green-400" />
                                                        {row.phone}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-left text-sm text-gray-600">{row.assignedCourses || 'None'}</td>
                                                <td className="p-4 text-left text-sm text-gray-600">{row.lastLogin}</td>
                                                <td className="p-4 text-left">
                                                    <button
                                                        onClick={() => handleToggle(index)}
                                                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${!row.isDeleted ? 'bg-green-500' : 'bg-gray-300'
                                                            } ${row.isDeleted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                        disabled={row.isDeleted}
                                                    >
                                                        <motion.span
                                                            layout
                                                            className="w-4 h-4 bg-white rounded-full shadow-md"
                                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                            animate={{ x: !row.isDeleted ? 20 : 0 }}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="p-4 text-left">
                                                    <button
                                                        onClick={() => openModal(row)}
                                                        className="text-blue-500 hover:text-blue-700 transition-transform transform hover:scale-110"
                                                    >
                                                        <FiEdit size={18} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Transition show={isModalOpen} as={Fragment}>
                        <Dialog as="div" className="relative z-50" onClose={closeModal}>
                            <Transition.Child
                                as={Fragment}
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
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                >
                                    <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 transform transition-all animate-slide-up">
                                        <Dialog.Title className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                            <FiUser className="text-blue-500 animate-pulse" size={24} />
                                            Edit Teacher
                                        </Dialog.Title>
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="relative group">
                                                <div className="flex items-center gap-3">
                                                    <FiUser className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                                                    <input
                                                        type="text"
                                                        placeholder="Full Name"
                                                        className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${formErrors.names ? 'border-red-500' : ''
                                                            }`}
                                                        value={formData.names}
                                                        onChange={(e) => setFormData({ ...formData, names: e.target.value })}
                                                        aria-label="Full name"
                                                        required
                                                    />
                                                </div>
                                                {formErrors.names && (
                                                    <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">{formErrors.names}</p>
                                                )}
                                            </div>
                                            <div className="relative group">
                                                <div className="flex items-center gap-3">
                                                    <FiMail className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
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
                                                    <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">{formErrors.email}</p>
                                                )}
                                            </div>
                                            <div className="relative group">
                                                <div className="flex items-center gap-3">
                                                    <FiPhoneCall className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                                                    <div className="flex w-full">
                                                        <span className="inline-flex items-center px-4 py-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-700 text-sm font-medium">
                                                            +250
                                                        </span>
                                                        <input
                                                            type="tel"
                                                            placeholder="78.....888"
                                                            className={`w-full px-4 py-3 rounded-r-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${formErrors.phone ? 'border-red-500' : ''
                                                                }`}
                                                            value={formData.phone.replace(/^\+250/, '')}
                                                            onChange={(e) => {
                                                                const digits = e.target.value.replace(/\D/g, '');
                                                                if (digits.length <= 9) {
                                                                    setFormData({
                                                                        ...formData,
                                                                        phone: digits ? `+250${digits}` : '',
                                                                    });
                                                                }
                                                            }}
                                                            aria-label="Phone number"
                                                            pattern="[1-9]\d{8}"
                                                            title="Phone number must be 9 digits starting with 1-9 (e.g., 798725288)"
                                                        />
                                                    </div>
                                                </div>
                                                {formErrors.phone && (
                                                    <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">{formErrors.phone}</p>
                                                )}
                                            </div>
                                            <div className="relative group">
                                                <div className="flex items-center gap-3">
                                                    <FiUser className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                                                    <select
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md"
                                                        value={formData.assignedCourses}
                                                        onChange={(e) => setFormData({ ...formData, assignedCourses: e.target.value })}
                                                        aria-label="Assigned courses"
                                                    >
                                                        <option value="">Select Course</option>
                                                        <option value="Math">Math</option>
                                                        <option value="Science">Science</option>
                                                        <option value="History">History</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                <div className="flex items-center gap-3">
                                                    <svg className="text-blue-500 group-hover:scale-110 transition-transform duration-200" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
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
                                                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
                                                    aria-label="Update teacher"
                                                >
                                                    <FiEdit size={20} />
                                                    Update
                                                </button>
                                            </div>
                                        </form>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </Dialog>
                    </Transition>
                </>
            )}
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

export default TeacherManagementTableNew;