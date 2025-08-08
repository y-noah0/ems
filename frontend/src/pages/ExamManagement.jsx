import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { FiChevronDown } from 'react-icons/fi';
import examService from "../services/examService";
import ExamCard from "../components/ui/ExamCard";

const ExamManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [subjectOptionsList, setSubjectOptionsList] = useState([]);
    const [classOptionsList, setClassOptionsList] = useState([]);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showClassDropdown, setShowClassDropdown] = useState(false);
    const subjectDropdownRef = useRef(null);
    const classDropdownRef = useRef(null);

    // Custom dropdown click-outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
                setShowSubjectDropdown(false);
            }
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
                setShowClassDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get status from URL query parameters
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const status = queryParams.get("status");
        if (status) {
            setFilterStatus(status === "unaproved" ? "draft" : status); // Fix typo
        }
    }, [location.search]);

    // Fetch exams, subjects, and classes
    const fetchData = async () => {
        if (!currentUser?.school) {
            toast.error('No school associated with your account. Please log in again.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch exams
            const examsData = await examService.getTeacherExams(currentUser.school);
            setExams(Array.isArray(examsData) ? examsData : []);

            // Fetch subjects
            const subjectsData = await examService.getTeacherSubjects(currentUser.school);
            setSubjectOptionsList(
                Array.isArray(subjectsData)
                    ? subjectsData.map(s => ({ value: s._id, label: s.name }))
                    : []
            );

            // Fetch classes
            const classesData = await examService.getClassesForTeacher(currentUser.school);
            setClassOptionsList(
                Array.isArray(classesData)
                    ? classesData.map(c => ({
                        value: c._id,
                        label: c.className || `${c.level}${c.trade?.code || ''}`
                    }))
                    : []
            );
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error(error.message || "Failed to load exams, subjects, or classes");
            setExams([]);
            setSubjectOptionsList([]);
            setClassOptionsList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    // Action handlers
    const handleActivateExam = async (examId) => {
        if (!currentUser?.school) {
            toast.error('No school associated with your account.');
            return;
        }

        setLoading(true);
        try {
            const updatedExam = await examService.activateExam(examId, currentUser.school);
            setExams(exams.map(exam => (exam._id === examId ? updatedExam : exam)));
            toast.success('Exam activated successfully!');
        } catch (error) {
            console.error('Error activating exam:', error);
            toast.error(error.message || 'Failed to activate exam');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteExam = async (examId) => {
        if (!currentUser?.school) {
            toast.error('No school associated with your account.');
            return;
        }

        setLoading(true);
        try {
            const updatedExam = await examService.completeExam(examId, currentUser.school);
            setExams(exams.map(exam => (exam._id === examId ? updatedExam : exam)));
            toast.success('Exam completed successfully!');
        } catch (error) {
            console.error('Error completing exam:', error);
            toast.error(error.message || 'Failed to complete exam');
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleExam = async (examId) => {
        if (!currentUser?.school) {
            toast.error('No school associated with your account.');
            return;
        }

        const startTime = prompt('Enter start time (YYYY-MM-DDTHH:MM):');
        const duration = prompt('Enter duration (minutes):');
        if (startTime && duration) {
            const scheduleData = {
                start: new Date(startTime).toISOString(),
                duration: parseInt(duration)
            };
            if (new Date(scheduleData.start) <= new Date()) {
                toast.error('Start time must be in the future');
                return;
            }
            if (scheduleData.duration < 5) {
                toast.error('Duration must be at least 5 minutes');
                return;
            }

            setLoading(true);
            try {
                const updatedExam = await examService.scheduleExam(examId, scheduleData, currentUser.school);
                setExams(exams.map(exam => (exam._id === examId ? updatedExam : exam)));
                toast.success('Exam scheduled successfully!');
            } catch (error) {
                console.error('Error scheduling exam:', error);
                toast.error(error.message || 'Failed to schedule exam');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteExam = async (examId) => {
        if (!currentUser?.school) {
            toast.error('No school associated with your account.');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this exam?')) {
            return;
        }

        setLoading(true);
        try {
            await examService.deleteExam(examId, currentUser.school);
            setExams(exams.filter(exam => exam._id !== examId));
            toast.success('Exam deleted successfully!');
        } catch (error) {
            console.error('Error deleting exam:', error);
            toast.error(error.message || 'Failed to delete exam');
        } finally {
            setLoading(false);
        }
    };

    // Calculate totalPoints dynamically
    const calculateTotalPoints = (questions) => {
        return questions?.reduce((sum, q) => sum + (parseInt(q.maxScore) || 0), 0) || 0;
    };

    // Filter exams
    const filteredExams = exams.filter((exam) => {
        const matchesStatus = filterStatus === "all" || exam.status === filterStatus;
        const matchesSearch =
            searchTerm === "" ||
            exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (exam.subject?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = !selectedSubject || exam.subject?._id === selectedSubject.value;
        const matchesClass = !selectedClass || exam.classes?.some(c => c._id === selectedClass.value);
        return matchesStatus && matchesSearch && matchesSubject && matchesClass;
    });

    // Sort exams: draft first, then scheduled, active, completed
    const statusOrder = { draft: 0, scheduled: 1, active: 2, completed: 3 };
    const sortedExams = [...filteredExams].sort((a, b) => {
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return (
        <Layout>
            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Search exams..."
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {/* Subject Filter */}
                        <div ref={subjectDropdownRef} className="relative">
                            <button
                                className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[120px]"
                                onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                            >
                                {selectedSubject?.label || 'Subject'}
                                <FiChevronDown className={`transition-transform ${showSubjectDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showSubjectDropdown && (
                                <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                                    <button
                                        className={`block w-full text-left px-4 py-2 text-sm ${!selectedSubject ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                                        onClick={() => { setSelectedSubject(null); setShowSubjectDropdown(false); }}
                                    >
                                        All Subjects
                                    </button>
                                    {subjectOptionsList.map(opt => (
                                        <button
                                            key={opt.value}
                                            className={`block w-full text-left px-4 py-2 text-sm ${selectedSubject?.value === opt.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                                            onClick={() => { setSelectedSubject(opt); setShowSubjectDropdown(false); }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Class Filter */}
                        <div ref={classDropdownRef} className="relative">
                            <button
                                className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[120px]"
                                onClick={() => setShowClassDropdown(!showClassDropdown)}
                            >
                                {selectedClass?.label || 'Class'}
                                <FiChevronDown className={`transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showClassDropdown && (
                                <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                                    <button
                                        className={`block w-full text-left px-4 py-2 text-sm ${!selectedClass ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                                        onClick={() => { setSelectedClass(null); setShowClassDropdown(false); }}
                                    >
                                        All Classes
                                    </button>
                                    {classOptionsList.map(opt => (
                                        <button
                                            key={opt.value}
                                            className={`block w-full text-left px-4 py-2 text-sm ${selectedClass?.value === opt.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                                            onClick={() => { setSelectedClass(opt); setShowClassDropdown(false); }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {currentUser?.role === "teacher" && (
                            <Button as={Link} to="/teacher/exams/create" variant="primary">
                                Create New Exam
                            </Button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : sortedExams.length === 0 ? (
                    <Card>
                        <div className="p-6 text-center">
                            <h3 className="text-xl font-medium text-gray-900 mb-2">
                                No exams found
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {searchTerm || filterStatus !== "all" || selectedSubject || selectedClass
                                    ? "Try changing your search or filter criteria"
                                    : "Exams will appear here once created."}
                            </p>
                            {currentUser?.role === "teacher" && (
                                <Button as={Link} to="/teacher/exams/create" variant="primary">
                                    Create New Exam
                                </Button>
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sortedExams.map((exam) => (
                                    <ExamCard
                                        key={exam._id}
                                        examId={exam._id}
                                        title={exam.title}
                                        subject={exam.subject?.name || "Unknown Subject"}
                                        classCode={
                                            Array.isArray(exam.classes) && exam.classes.length > 0
                                                ? exam.classes.map(c => c.className || `${c.level}${c.trade?.code || ''}`).join(', ')
                                                : "No class assigned"
                                        }
                                        description={exam.instructions || `${exam.type.charAt(0).toUpperCase() + exam.type.slice(1)} - ${exam.status}`}
                                        status={exam.status}
                                        startTime={
                                            exam.schedule?.start
                                                ? new Date(exam.schedule.start).toLocaleString("en-US", {
                                                    dateStyle: "medium",
                                                    timeStyle: "short"
                                                })
                                                : "Not scheduled"
                                        }
                                        endTime={
                                            exam.schedule?.start && exam.schedule?.duration
                                                ? new Date(
                                                    new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000
                                                ).toLocaleString("en-US", {
                                                    dateStyle: "medium",
                                                    timeStyle: "short"
                                                })
                                                : "Not scheduled"
                                        }
                                        questions={exam.questions?.length || 0}
                                        totalPoints={calculateTotalPoints(exam.questions)}
                                        userRole={currentUser?.role || "teacher"}
                                        actions={[
                                            ...(exam.status === "draft" ? [
                                                {
                                                    label: "Schedule",
                                                    onClick: () => handleScheduleExam(exam._id)
                                                },
                                                {
                                                    label: "Edit",
                                                    onClick: () => navigate(`/teacher/exams/${exam._id}/edit`)
                                                }
                                            ] : []),
                                            ...(exam.status === "scheduled" ? [
                                                {
                                                    label: "Activate",
                                                    onClick: () => handleActivateExam(exam._id)
                                                },
                                                {
                                                    label: "Edit",
                                                    onClick: () => navigate(`/teacher/exams/${exam._id}/edit`)
                                                }
                                            ] : []),
                                            ...(exam.status === "active" ? [
                                                {
                                                    label: "Complete",
                                                    onClick: () => handleCompleteExam(exam._id)
                                                },
                                                {
                                                    label: "View Submissions",
                                                    onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`)
                                                }
                                            ] : []),
                                            ...(exam.status === "completed" ? [
                                                {
                                                    label: "View Submissions",
                                                    onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`)
                                                }
                                            ] : []),
                                            {
                                                label: "Delete",
                                                onClick: () => handleDeleteExam(exam._id),
                                                variant: "danger"
                                            }
                                        ]}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="w-fit">
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant={filterStatus === "all" ? "primary" : "outline"}
                                    size="xs"
                                    onClick={() => setFilterStatus("all")}
                                >
                                    All
                                </Button>
                                <Button
                                    variant={filterStatus === "draft" ? "primary" : "outline"}
                                    size="xs"
                                    onClick={() => setFilterStatus("draft")}
                                >
                                    Draft
                                </Button>
                                <Button
                                    variant={filterStatus === "scheduled" ? "primary" : "outline"}
                                    size="xs"
                                    onClick={() => setFilterStatus("scheduled")}
                                >
                                    Scheduled
                                </Button>
                                <Button
                                    variant={filterStatus === "active" ? "primary" : "outline"}
                                    size="xs"
                                    onClick={() => setFilterStatus("active")}
                                >
                                    Active
                                </Button>
                                <Button
                                    variant={filterStatus === "completed" ? "primary" : "outline"}
                                    size="xs"
                                    onClick={() => setFilterStatus("completed")}
                                >
                                    Completed
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ExamManagement;