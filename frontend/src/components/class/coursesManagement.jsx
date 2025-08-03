import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Search, CheckCircle2, Eye, BookOpen, CreditCard, User, Tag, School, X } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import schoolService from '../../services/schoolService';
import subjectService from '../../services/subjectService';
import teacherService from '../../services/teacherService';

const CourseManagement = () => {
    const { currentUser } = useAuth();
    const [subjectsData, setSubjectsData] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [trades, setTrades] = useState([]);
    const [classesBySubject, setClassesBySubject] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        credits: 1,
        teacher: '',
        trades: [],
        status: 'Active',
    });
    const [formErrors, setFormErrors] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterStatus, setFilterStatus] = useState('All');
    const [notification, setNotification] = useState(null);
    const [isTradeDropdownOpen, setIsTradeDropdownOpen] = useState(false);
    const tradeDropdownRef = useRef(null);

    const schoolId = currentUser?.school;

    // Debug: Log schoolId
    useEffect(() => {
        console.log('School ID:', schoolId);
    }, [schoolId]);

    // Handle click outside to close trades dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tradeDropdownRef.current && !tradeDropdownRef.current.contains(event.target)) {
                setIsTradeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch initial data (subjects, teachers, trades)
    const fetchInitialData = async () => {
        if (!schoolId) {
            console.error('No schoolId found');
            setNotification({ type: 'error', message: 'No school associated with your account.' });
            toast.error('No school associated with your account.');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Fetch subjects
            console.log('Fetching subjects for schoolId:', schoolId);
            const subjects = await subjectService.getSubjects(schoolId);
            console.log('Subjects fetched:', subjects);
            setSubjectsData(Array.isArray(subjects) ? subjects : []);

            // Fetch teachers
            console.log('Fetching teachers for schoolId:', schoolId);
            const teacherData = await teacherService.fetchTeachers(schoolId);
            console.log('Teachers fetched:', teacherData);
            setTeachers(Array.isArray(teacherData) ? teacherData : []);

            // Fetch trades
            console.log('Fetching trades for schoolId:', schoolId);
            const tradeData = await schoolService.getTradesOfferedBySchool(schoolId);
            console.log('Trades fetched:', tradeData);
            setTrades(Array.isArray(tradeData) ? tradeData : []);

            // Fetch classes for each subject
            const classesPromises = subjects.map(async (subject) => {
                try {
                    const classes = await subjectService.getClassesBySubject(subject._id, schoolId);
                    return { subjectId: subject._id, classes: Array.isArray(classes) ? classes : [] };
                } catch (error) {
                    console.error(`Error fetching classes for subject ${subject._id}:`, error);
                    return { subjectId: subject._id, classes: [] };
                }
            });
            const classesResults = await Promise.all(classesPromises);
            const classesMap = classesResults.reduce((acc, { subjectId, classes }) => {
                acc[subjectId] = classes;
                return acc;
            }, {});
            setClassesBySubject(classesMap);
            console.log('Classes by subject fetched:', classesMap);
        } catch (error) {
            console.error('Error in fetchInitialData:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch initial data';
            setNotification({ type: 'error', message: errorMessage });
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            console.log('Loading state set to:', false);
        }
    };

    useEffect(() => {
        if (schoolId && !loading) {
            console.log('Triggering fetchInitialData');
            fetchInitialData();
        }
    }, [schoolId]);

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Subject name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (!formData.credits || formData.credits < 1) errors.credits = 'Credits must be at least 1';
        if (!schoolId) errors.schoolId = 'School ID is required';
        console.log('Form validation errors:', errors);
        return errors;
    };

    const openModal = (subject = null) => {
        console.log('Opening modal for subject:', subject);
        setSelectedSubject(subject);
        setFormData(
            subject
                ? {
                    name: subject.name || '',
                    description: subject.description || '',
                    credits: subject.credits || 1,
                    teacher: subject.teacher?._id || '',
                    trades: Array.isArray(subject.trades) ? subject.trades.map(trade => trade._id) : [],
                    status: subject.isDeleted ? 'Inactive' : 'Active',
                }
                : {
                    name: '',
                    description: '',
                    credits: 1,
                    teacher: '',
                    trades: [],
                    status: 'Active',
                }
        );
        setFormErrors({});
        setIsModalOpen(true);
        console.log('Form data set:', formData);
    };

    const openViewModal = (subject) => {
        console.log('Opening view modal for subject:', subject);
        setSelectedSubject(subject);
        setIsViewModalOpen(true);
    };

    const closeModal = () => {
        console.log('Closing modal');
        setIsModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedSubject(null);
        setFormErrors({});
        setIsTradeDropdownOpen(false);
    };

    const handleTradeSelect = (tradeId) => {
        console.log('Selecting trade:', tradeId);
        if (!tradeId) return; // Prevent invalid tradeId
        setFormData((prev) => {
            const newTrades = prev.trades.includes(tradeId)
                ? prev.trades.filter((id) => id !== tradeId)
                : [...prev.trades, tradeId];
            console.log('Updated trades:', newTrades);
            return { ...prev, trades: newTrades };
        });
        setIsTradeDropdownOpen(false); // Close dropdown after selection
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Submitting form with data:', formData);
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            console.log('Form validation failed:', errors);
            if (errors.schoolId) {
                toast.error('No valid school ID found. Please log in again.');
            }
            return;
        }

        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                schoolId, // Using schoolId from currentUser
                credits: parseInt(formData.credits),
                teacher: formData.teacher || null,
                trades: formData.trades,
                isDeleted: formData.status === 'Inactive',
            };
            console.log('Submitting payload:', payload);

            if (selectedSubject) {
                console.log('Updating subject:', selectedSubject._id);
                const updatedSubject = await subjectService.updateSubject(selectedSubject._id, payload);
                console.log('Updated subject response:', updatedSubject);
                setSubjectsData(
                    subjectsData.map((s) =>
                        s._id === selectedSubject._id
                            ? {
                                ...updatedSubject,
                                teacher: teachers.find(t => t._id === updatedSubject.teacher) || null,
                                trades: trades.filter(t => updatedSubject.trades.includes(t._id)),
                            }
                            : s
                    )
                );
                // Refresh classes for the updated subject
                try {
                    const classes = await subjectService.getClassesBySubject(updatedSubject._id, schoolId);
                    setClassesBySubject((prev) => ({
                        ...prev,
                        [updatedSubject._id]: Array.isArray(classes) ? classes : [],
                    }));
                } catch (error) {
                    console.error(`Error refreshing classes for subject ${updatedSubject._id}:`, error);
                }
                setNotification({ type: 'success', message: 'Subject updated successfully!' });
                toast.success('Subject updated successfully!');
            } else {
                console.log('Creating new subject');
                const newSubject = await subjectService.createSubject(payload);
                console.log('Created subject response:', newSubject);
                setSubjectsData([
                    ...subjectsData,
                    {
                        ...newSubject,
                        teacher: teachers.find(t => t._id === newSubject.teacher) || null,
                        trades: trades.filter(t => newSubject.trades.includes(t._id)),
                    },
                ]);
                // Fetch classes for the new subject
                try {
                    const classes = await subjectService.getClassesBySubject(newSubject._id, schoolId);
                    setClassesBySubject((prev) => ({
                        ...prev,
                        [newSubject._id]: Array.isArray(classes) ? classes : [],
                    }));
                } catch (error) {
                    console.error(`Error fetching classes for new subject ${newSubject._id}:`, error);
                }
                setNotification({ type: 'success', message: 'Subject added successfully!' });
                toast.success('Subject added successfully!');
            }
            closeModal();
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save subject';
            setNotification({ type: 'error', message: errorMessage });
            toast.error(errorMessage);
        }
    };

    const handleDelete = async (subjectId) => {
        console.log('Deleting subject:', subjectId);
        if (window.confirm('Are you sure you want to delete this subject?')) {
            try {
                await subjectService.deleteSubject(subjectId, schoolId);
                console.log('Subject deleted:', subjectId);
                setSubjectsData(subjectsData.filter((s) => s._id !== subjectId));
                setClassesBySubject((prev) => {
                    const newClasses = { ...prev };
                    delete newClasses[subjectId];
                    return newClasses;
                });
                setNotification({ type: 'success', message: 'Subject deleted successfully!' });
                toast.success('Subject deleted successfully!');
            } catch (error) {
                console.error('Error in handleDelete:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to delete subject';
                setNotification({ type: 'error', message: errorMessage });
                toast.error(errorMessage);
            }
        }
    };

    const filteredSubjects = subjectsData
        .filter(
            (subject) =>
                (filterStatus === 'All' ||
                    (filterStatus === 'Active' && !subject.isDeleted) ||
                    (filterStatus === 'Inactive' && subject.isDeleted)) &&
                (subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
            console.log('Notification set:', notification);
            const timer = setTimeout(() => {
                console.log('Clearing notification');
                setNotification(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
                    <h1 className="text-3xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-0 tracking-tight">
                        Subject Management
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72 group">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors duration-200"
                                size={20}
                            />
                            <input
                                type="text"
                                placeholder="Search subjects..."
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                aria-label="Search subjects"
                            />
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                            disabled={!schoolId}
                        >
                            <Plus size={20} /> Add Subject
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white p-5 rounded-xl shadow-lg">
                    <div className="flex items-center group">
                        <label className="text-sm font-semibold text-gray-700 mr-2">Sort by:</label>
                        <select
                            className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:shadow-md"
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value)}
                            aria-label="Sort by"
                        >
                            <option value="name">Name</option>
                            <option value="credits">Credits</option>
                            <option value="isDeleted">Status</option>
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

                {notification && (
                    <div
                        className={`fixed top-4 right-4 px-5 py-3 rounded-lg shadow-xl text-white animate-slide-in flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
                    >
                        <CheckCircle2 size={20} />
                        {notification.message}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
                    </div>
                ) : filteredSubjects.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-8 text-lg">
                        No subjects match the current filters.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSubjects.map((subject) => (
                            <div
                                key={subject._id}
                                className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in group"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">
                                        {subject.name}
                                    </h2>
                                    <CheckCircle2
                                        className={`${!subject.isDeleted ? 'text-green-500' : 'text-red-400'} animate-pulse`}
                                        size={32}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <p className="flex items-start gap-2">
                                        <BookOpen className="text-blue-500 mt-1 group-hover:scale-110 transition-transform duration-200" size={20} />
                                        <span>
                                            <span className="font-medium text-gray-600">Description:</span>{' '}
                                            <span className="text-gray-700">{subject.description}</span>
                                        </span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <CreditCard className="text-blue-500 mt-1 group-hover:scale-110 transition-transform duration-200" size={20} />
                                        <span>
                                            <span className="font-medium text-gray-600">Credits:</span>{' '}
                                            <span className="text-gray-700">{subject.credits}</span>
                                        </span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <User className="text-blue-500 mt-1 group-hover:scale-110 transition-transform duration-200" size={20} />
                                        <span>
                                            <span className="font-medium text-gray-600">Teacher:</span>{' '}
                                            <span className="text-gray-700">
                                                {subject.teacher?.fullName || 'No Teacher Assigned'}
                                            </span>
                                        </span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <Tag className="text-blue-500 mt-1 group-hover:scale-110 transition-transform duration-200" size={20} />
                                        <span>
                                            <span className="font-medium text-gray-600">Trades:</span>{' '}
                                            <span className="text-gray-700">
                                                {subject.trades?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {subject.trades.map((trade) => (
                                                            <span
                                                                key={trade._id}
                                                                className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium animate-chip-enter"
                                                            >
                                                                {trade.name || 'Unknown'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    'No Trades Assigned'
                                                )}
                                            </span>
                                        </span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <School className="text-blue-500 mt-1 group-hover:scale-110 transition-transform duration-200" size={20} />
                                        <span>
                                            <span className="font-medium text-gray-600">Classes:</span>{' '}
                                            <span className="text-gray-700">
                                                {classesBySubject[subject._id]?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {classesBySubject[subject._id].map((cls) => (
                                                            <span
                                                                key={cls._id}
                                                                className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium animate-chip-enter"
                                                            >
                                                                {cls.name || 'Unknown'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    'No Classes Assigned'
                                                )}
                                            </span>
                                        </span>
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3 mt-5">
                                    <button
                                        onClick={() => openViewModal(subject)}
                                        className="text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-100 transform hover:scale-110 transition-all duration-200"
                                        aria-label={`View ${subject.name}`}
                                        title="View More"
                                    >
                                        <Eye size={24} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(subject._id)}
                                        className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-100 transform hover:scale-110 transition-all duration-200"
                                        aria-label={`Delete ${subject.name}`}
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
                                        <BookOpen className="text-blue-500 animate-pulse" size={24} />
                                        {selectedSubject ? 'Edit Subject' : 'Add Subject'}
                                    </Dialog.Title>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="relative group">
                                            <div className="flex items-center gap-3">
                                                <BookOpen className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                                                <input
                                                    type="text"
                                                    placeholder="Subject Name"
                                                    className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${formErrors.name ? 'border-red-500' : ''}`}
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    aria-label="Subject name"
                                                    required
                                                />
                                            </div>
                                            {formErrors.name && (
                                                <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">
                                                    {formErrors.name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="relative group">
                                            <div className="flex items-start gap-3">
                                                <BookOpen className="text-blue-500 mt-3 group-hover:scale-110 transition-transform duration-200" size={20} />
                                                <textarea
                                                    placeholder="Description"
                                                    className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md resize-none h-28 ${formErrors.description ? 'border-red-500' : ''}`}
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    aria-label="Description"
                                                    required
                                                />
                                            </div>
                                            {formErrors.description && (
                                                <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">
                                                    {formErrors.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="relative group">
                                            <div className="flex items-center gap-3">
                                                <CreditCard className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                                                <input
                                                    type="number"
                                                    placeholder="Credits"
                                                    className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${formErrors.credits ? 'border-red-500' : ''}`}
                                                    value={formData.credits}
                                                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                                                    aria-label="Credits"
                                                    min="1"
                                                    required
                                                />
                                            </div>
                                            {formErrors.credits && (
                                                <p className="text-red-500 text-sm mt-1 pl-9 animate-fade-in">
                                                    {formErrors.credits}
                                                </p>
                                            )}
                                        </div>
                                        <div className="relative group">
                                            <div className="flex items-center gap-3">
                                                <User className="text-blue-500 group-hover:scale-110 transition-transform duration-200" size={20} />
                                                <select
                                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md"
                                                    value={formData.teacher}
                                                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                                                    aria-label="Teacher"
                                                >
                                                    <option value="">No Teacher</option>
                                                    {teachers.map((teacher) => (
                                                        <option key={teacher._id} value={teacher._id}>
                                                            {teacher.fullName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="relative group" ref={tradeDropdownRef}>
                                            <div className="flex items-start gap-3">
                                                <Tag className="text-blue-500 mt-2 group-hover:scale-110 transition-transform duration-200" size={20} />
                                                <div className="w-full">
                                                    <div
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-300 hover:shadow-md cursor-pointer"
                                                        onClick={() => setIsTradeDropdownOpen((prev) => !prev)}
                                                    >
                                                        {formData.trades.length === 0 ? (
                                                            <span className="text-gray-500">Select Trades...</span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2">
                                                                {formData.trades.map((tradeId) => {
                                                                    const trade = trades.find((t) => t._id === tradeId);
                                                                    return (
                                                                        trade && (
                                                                            <span
                                                                                key={trade._id}
                                                                                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium animate-chip-enter"
                                                                            >
                                                                                {trade.name || 'Unknown'}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleTradeSelect(trade._id);
                                                                                    }}
                                                                                    className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                                                                                >
                                                                                    <X size={14} />
                                                                                </button>
                                                                            </span>
                                                                        )
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isTradeDropdownOpen && (
                                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-slide-down">
                                                            {trades.length > 0 ? (
                                                                trades.map((trade) => (
                                                                    trade && (
                                                                        <div
                                                                            key={trade._id}
                                                                            className={`px-4 py-2 hover:bg-blue-50 cursor-pointer transition-all duration-200 flex items-center gap-2 ${formData.trades.includes(trade._id) ? 'bg-blue-100 text-blue-800 font-medium' : ''}`}
                                                                            onClick={() => handleTradeSelect(trade._id)}
                                                                        >
                                                                            <Tag size={16} className="text-blue-500" />
                                                                            {trade.name || 'Unknown'}
                                                                        </div>
                                                                    )
                                                                ))
                                                            ) : (
                                                                <div className="px-4 py-2 text-gray-500">No trades available</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
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
                                        {formErrors.schoolId && (
                                            <p className="text-red-500 text-sm mt-1 animate-fade-in">
                                                {formErrors.schoolId}
                                            </p>
                                        )}
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
                                                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                aria-label={selectedSubject ? 'Update subject' : 'Add subject'}
                                                disabled={!schoolId}
                                            >
                                                <Plus size={20} />
                                                {selectedSubject ? 'Update' : 'Save'}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </Dialog>
                </Transition>

                <Transition show={isViewModalOpen} as={React.Fragment}>
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
                                <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 transform transition-all animate-slide-up">
                                    <Dialog.Title className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <Eye className="text-blue-500 animate-pulse" size={24} />
                                        Subject Details
                                    </Dialog.Title>
                                    {selectedSubject && (
                                        <div className="space-y-6">
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <tbody>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-fade-in">
                                                            <td className="py-3 px-4 font-medium text-gray-600 flex items-center gap-2">
                                                                <BookOpen className="text-blue-500" size={20} />
                                                                Name
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-800 font-semibold">
                                                                {selectedSubject.name}
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-fade-in">
                                                            <td className="py-3 px-4 font-medium text-gray-600 flex items-center gap-2">
                                                                <BookOpen className="text-blue-500" size={20} />
                                                                Description
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700">
                                                                {selectedSubject.description}
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-fade-in">
                                                            <td className="py-3 px-4 font-medium text-gray-600 flex items-center gap-2">
                                                                <CreditCard className="text-blue-500" size={20} />
                                                                Credits
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700">
                                                                {selectedSubject.credits}
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-fade-in">
                                                            <td className="py-3 px-4 font-medium text-gray-600 flex items-center gap-2">
                                                                <User className="text-blue-500" size={20} />
                                                                Teacher
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700">
                                                                {selectedSubject.teacher?.fullName || 'No Teacher Assigned'}
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-fade-in">
                                                            <td className="py-3 px-4 font-medium text-gray-600 flex items-center gap-2">
                                                                <Tag className="text-blue-500" size={20} />
                                                                Trades
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700">
                                                                {selectedSubject.trades?.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {selectedSubject.trades.map((trade) => (
                                                                            <span
                                                                                key={trade._id}
                                                                                className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium animate-chip-enter"
                                                                            >
                                                                                {trade.name || 'Unknown'}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    'No Trades Assigned'
                                                                )}
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-fade-in">
                                                            <td className="py-3 px-4 font-medium text-gray-600 flex items-center gap-2">
                                                                <School className="text-blue-500" size={20} />
                                                                Classes
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700">
                                                                {classesBySubject[selectedSubject._id]?.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {classesBySubject[selectedSubject._id].map((cls) => (
                                                                            <span
                                                                                key={cls._id}
                                                                                className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium animate-chip-enter"
                                                                            >
                                                                                {cls.name || 'Unknown'}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    'No Classes Assigned'
                                                                )}
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-fade-in">
                                                            <td className="py-3 px-4 font-medium text-gray-600 flex items-center gap-2">
                                                                <School className="text-blue-500" size={20} />
                                                                School
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700">
                                                                {selectedSubject.school?.name || 'Unknown School'}
                                                            </td>
                                                        </tr>
                                                        <tr className="hover:bg-gray-50 transition-all duration-200 animate-fade-in">
                                                            <td className="py-3 px-4 font-medium text-gray-600 flex items-center gap-2">
                                                                <CheckCircle2 className="text-blue-500" size={20} />
                                                                Status
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700">
                                                                {selectedSubject.isDeleted ? 'Inactive' : 'Active'}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="flex justify-end gap-3 mt-6">
                                                <button
                                                    onClick={() => {
                                                        closeModal();
                                                        openModal(selectedSubject);
                                                    }}
                                                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
                                                    aria-label="Edit subject"
                                                >
                                                    <BookOpen size={20} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={closeModal}
                                                    className="px-5 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300"
                                                    aria-label="Close"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes chipEnter {
                    from {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
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
                .animate-slide-down {
                    animation: slideDown 0.3s ease-out;
                }
                .animate-chip-enter {
                    animation: chipEnter 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default CourseManagement;