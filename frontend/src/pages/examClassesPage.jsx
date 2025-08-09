import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FaUsers, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import ClassCard from '../components/ClassCard';
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

const ExamClassesPage = () => {
    const navigate = useNavigate();
    const { examId } = useParams();
    const { currentUser } = useAuth();
    const [exam, setExam] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [visibleClasses, setVisibleClasses] = useState(10);

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
            const examSubmissions = dummySubmissions.filter((s) => s.exam._id === examId);
            const classIds = [...new Set(examSubmissions.map((s) => s.class._id))];
            const classesWithSubmissions = foundExam.classes.filter((c) => classIds.includes(c._id));
            setExam(foundExam);
            setSubmissions(examSubmissions);
            setClasses(classesWithSubmissions);
        } catch (error) {
            console.error('Error loading dummy data:', error);
            setError(error.message || 'Failed to load classes');
            toast.error(error.message || 'Failed to load classes');
        } finally {
            setLoading(false);
        }
    }, [currentUser, navigate, examId]);

    return (
        <Layout>
            <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto font-roboto">
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <FaArrowLeft
                        className="h-5 sm:h-6 w-5 sm:w-6 text-indigo-600 cursor-pointer"
                        onClick={() => navigate('/teacher/submissions')}
                        aria-label="Go back to exams list"
                    />
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Classes for {exam?.title || 'Exam'}
                    </h1>
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
                    ) : classes.length === 0 ? (
                        <div className="bg-gray-50 border border-indigo-200 p-6 sm:p-8 text-center rounded-lg max-w-3xl mx-auto animate-fade-in">
                            <div className="text-4xl sm:text-5xl mb-4">📚</div>
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">No Classes Found</h3>
                            <p className="text-sm sm:text-base text-gray-600 mb-6">
                                No classes have submissions for this exam.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
                            {classes.slice(0, visibleClasses).map((cls) => (
                                <ClassCard
                                    key={cls._id}
                                    classInfo={cls}
                                    submissions={submissions.filter((s) => s.class._id === cls._id)}
                                    onViewMore={() => navigate(`/teacher/exams/${examId}/classes/${cls._id}/submissions`)}
                                />
                            ))}
                            {classes.length > visibleClasses && (
                                <div className="col-span-full text-center mt-4">
                                    <Button
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 text-sm sm:text-base"
                                        onClick={() => setVisibleClasses((prev) => prev + 10)}
                                        aria-label="Show more classes"
                                    >
                                        Show More
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
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

export default ExamClassesPage;