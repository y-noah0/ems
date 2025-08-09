import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FaSearch, FaFilter, FaCheckCircle, FaFileAlt, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import SubmissionCard from '../components/SubmissionCard';
import Button from '../components/ui/Button';

// Dummy data
const dummyExams = [
    {
        _id: 'exam1',
        title: 'Math Midterm Exam',
        subject: { _id: 'sub1', name: 'Mathematics' },
        classes: [
            { _id: 'class1', className: 'Grade 10A', level: '10', trade: { code: 'A' } },
            { _id: 'class2', className: 'Grade 10B', level: '10', trade: { code: 'B' } },
        ],
        schedule: { start: '2025-08-01T10:00:00Z', duration: 60 },
        questions: [{ maxScore: 20 }, { maxScore: 30 }],
        totalPoints: 50,
        createdAt: '2025-07-30T12:00:00Z',
    },
    {
        _id: 'exam2',
        title: 'Physics Final Exam',
        subject: { _id: 'sub2', name: 'Physics' },
        classes: [{ _id: 'class3', className: 'Grade 11C', level: '11', trade: { code: 'C' } }],
        schedule: { start: '2025-07-15T14:00:00Z', duration: 90 },
        questions: [{ maxScore: 40 }],
        totalPoints: 40,
        createdAt: '2025-07-10T09:00:00Z',
    },
];

const dummySubmissions = [
    {
        _id: 'sub1',
        exam: dummyExams[0],
        student: { firstName: 'John', lastName: 'Doe', registrationNumber: 'STU001' },
        class: dummyExams[0].classes[0],
        status: 'pending',
        score: 0,
        totalPoints: 50,
        submittedAt: '2025-08-01T11:00:00Z',
    },
    {
        _id: 'sub2',
        exam: dummyExams[0],
        student: { firstName: 'Jane', lastName: 'Smith', registrationNumber: 'STU002' },
        class: dummyExams[0].classes[0],
        status: 'graded',
        score: 45,
        totalPoints: 50,
        submittedAt: '2025-08-01T11:15:00Z',
    },
    {
        _id: 'sub3',
        exam: dummyExams[0],
        student: { firstName: 'Alice', lastName: 'Brown', registrationNumber: 'STU003' },
        class: dummyExams[0].classes[1],
        status: 'pending',
        score: 0,
        totalPoints: 50,
        submittedAt: '2025-08-01T11:30:00Z',
    },
    {
        _id: 'sub4',
        exam: dummyExams[1],
        student: { firstName: 'Bob', lastName: 'Wilson', registrationNumber: 'STU004' },
        class: dummyExams[1].classes[0],
        status: 'graded',
        score: 35,
        totalPoints: 40,
        submittedAt: '2025-07-15T15:00:00Z',
    },
];

const ClassSubmissionsPage = () => {
    const navigate = useNavigate();
    const { examId, classId } = useParams();
    const { currentUser } = useAuth();
    const [exam, setExam] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [classInfo, setClassInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [visibleSubmissions, setVisibleSubmissions] = useState(10);
    const filterMenuRef = useRef(null);

    // Custom debounce function
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // Handle click outside for filter menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load dummy data
    useEffect(() => {
        if (!currentUser?.school) {
            const errorMsg = 'No school associated with your account. Please log in again.';
            setError(errorMsg);
            toast.error(errorMsg);
            setLoading(false);
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            const foundExam = dummyExams.find((e) => e._id === examId);
            if (!foundExam) {
                throw new Error('Exam not found');
            }
            const foundClass = foundExam.classes.find((c) => c._id === classId);
            if (!foundClass) {
                throw new Error('Class not found');
            }
            const classSubmissions = dummySubmissions.filter(
                (s) => s.exam._id === examId && s.class._id === classId
            );
            setExam(foundExam);
            setClassInfo(foundClass);
            setSubmissions(classSubmissions);
        } catch (error) {
            console.error('Error loading dummy data:', error);
            setError(error.message || 'Failed to load submissions');
            toast.error(error.message || 'Failed to load submissions');
        } finally {
            setLoading(false);
        }
    }, [currentUser, navigate, examId, classId]);

    // Debounced search handler
    const debouncedSetSearchTerm = debounce((value) => setSearchTerm(value), 300);

    // Filter submissions
    const filteredSubmissions = useMemo(() => {
        return submissions.filter((submission) => {
            const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
            const matchesSearch =
                searchTerm === '' ||
                (submission.student?.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (submission.student?.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (submission.student?.registrationNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [submissions, filterStatus, searchTerm]);

    return (
        <Layout>
            <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto font-roboto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <FaArrowLeft
                            className="h-5 sm:h-6 w-5 sm:w-6 text-indigo-600 cursor-pointer"
                            onClick={() => navigate(`/teacher/exams/${examId}/classes`)}
                            aria-label="Go back to classes list"
                        />
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            Submissions for {classInfo?.className || 'Class'} - {exam?.title || 'Exam'}
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search submissions..."
                                className="pl-10 pr-4 py-2 w-full bg-gray-50 border border-indigo-300 rounded-full text-sm sm:text-base text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                                aria-label="Search submissions"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div className="sm:hidden mb-4">
                        <div ref={filterMenuRef} className="relative">
                            <Button
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 w-full"
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                aria-label="Toggle filter menu"
                                aria-expanded={showFilterMenu}
                            >
                                <FaFilter className="h-4 sm:h-5 w-4 sm:w-5" />
                                Filters
                            </Button>
                            {showFilterMenu && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-indigo-200 rounded-lg shadow-xl z-20 overflow-hidden transition-all duration-200">
                                    {[
                                        { status: 'all', label: 'All', icon: FaFilter },
                                        { status: 'pending', label: 'Pending', icon: FaFileAlt },
                                        { status: 'graded', label: 'Graded', icon: FaCheckCircle },
                                    ].map(({ status, label, icon: Icon }) => (
                                        <Button
                                            key={status}
                                            variant={filterStatus === status ? 'primary' : 'outline'}
                                            size="sm"
                                            onClick={() => {
                                                setFilterStatus(status);
                                                setShowFilterMenu(false);
                                            }}
                                            className={`flex items-center gap-2 w-full justify-start px-3 sm:px-4 py-2 text-sm sm:text-base ${filterStatus === status
                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                    : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                                                } rounded-none`}
                                            aria-label={`Filter by ${label}`}
                                        >
                                            <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex justify-center items-center py-12 sm:py-16 min-h-[40vh]">
                                <FaSpinner className="h-10 sm:h-12 w-10 sm:w-12 text-indigo-600 animate-spin" aria-hidden="true" />
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 border border-red-200 p-6 sm:p-8 text-center rounded-lg max-w-3xl mx-auto animate-fade-in">
                                <div className="text-red-700 text-xl sm:text-2xl mb-4">{error}</div>
                                <Button
                                    onClick={() => navigate('/login')}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 sm:px-6 py-2"
                                >
                                    Go to Login
                                </Button>
                            </div>
                        ) : filteredSubmissions.length === 0 ? (
                            <div className="bg-gray-50 border border-indigo-200 p-6 sm:p-8 text-center rounded-lg max-w-3xl mx-auto animate-fade-in">
                                <div className="text-4xl sm:text-5xl mb-4">📝</div>
                                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">No Submissions Found</h3>
                                <p className="text-sm sm:text-base text-gray-600 mb-6">
                                    {searchTerm || filterStatus !== 'all'
                                        ? 'Try adjusting your search or filter settings.'
                                        : 'No submissions for this class and exam.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
                                {filteredSubmissions.slice(0, visibleSubmissions).map((submission) => (
                                    <SubmissionCard
                                        key={submission._id}
                                        submission={submission}
                                        onReview={() => navigate(`/teacher/submissions/${submission._id}/view`)}
                                    />
                                ))}
                                {filteredSubmissions.length > visibleSubmissions && (
                                    <div className="col-span-full text-center mt-4">
                                        <Button
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 text-sm sm:text-base"
                                            onClick={() => setVisibleSubmissions((prev) => prev + 10)}
                                            aria-label="Show more submissions"
                                        >
                                            Show More
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="hidden sm:block w-full sm:w-48">
                        <div className="sticky top-6">
                            <div className="flex items-center gap-2 mb-4">
                                <FaFilter className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-base sm:text-lg font-semibold text-indigo-600">Filters</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                                {[
                                    { status: 'all', label: 'All', icon: FaFilter },
                                    { status: 'pending', label: 'Pending', icon: FaFileAlt },
                                    { status: 'graded', label: 'Graded', icon: FaCheckCircle },
                                ].map(({ status, label, icon: Icon }) => (
                                    <Button
                                        key={status}
                                        variant={filterStatus === status ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterStatus(status)}
                                        className={`flex items-center gap-2 w-full justify-start px-3 sm:px-4 py-2 text-sm sm:text-base ${filterStatus === status
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                                            } rounded-md`}
                                        aria-label={`Filter by ${label}`}
                                    >
                                        <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        .font-roboto {
          font-family: 'Roboto', sans-serif;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
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
      `}</style>
        </Layout>
    );
};

export default ClassSubmissionsPage;