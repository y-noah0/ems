import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { FaSearch, FaPlus, FaBook, FaUsers, FaFilter, FaTrash, FaEdit, FaEye, FaCalendar, FaPlayCircle, FaCheckCircle, FaFileAlt, FaSpinner, FaChevronDown } from "react-icons/fa";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import ExamCard from "../components/ui/ExamCard";
import examService from "../services/examService";

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
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [visibleExams, setVisibleExams] = useState(10);
    const subjectDropdownRef = useRef(null);
    const classDropdownRef = useRef(null);
    const filterMenuRef = useRef(null);

    // Custom debounce function
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // Handle click outside for dropdowns and filter menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
                setShowSubjectDropdown(false);
            }
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
                setShowClassDropdown(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Get status from URL query parameters
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const status = queryParams.get("status");
        if (status) {
            setFilterStatus(status === "unaproved" ? "draft" : status);
        }
    }, [location.search]);

    // Fetch exams, subjects, and classes
    const fetchData = async () => {
        if (!currentUser?.school) {
            toast.error("No school associated with your account. Please log in again.");
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [examsData, subjectsData, classesData] = await Promise.all([
                examService.getTeacherExams(currentUser.school),
                examService.getTeacherSubjects(currentUser.school),
                examService.getClassesForTeacher(currentUser.school),
            ]);
            setExams(Array.isArray(examsData) ? examsData : []);
            setSubjectOptionsList(
                Array.isArray(subjectsData)
                    ? subjectsData.map((s) => ({ value: s._id, label: s.name }))
                    : []
            );
            setClassOptionsList(
                Array.isArray(classesData)
                    ? classesData.map((c) => ({
                        value: c._id,
                        label: c.className || `${c.level}${c.trade?.code || ""}`,
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
            toast.error("No school associated with your account.");
            return;
        }
        setLoading(true);
        try {
            const updatedExam = await examService.activateExam(examId, currentUser.school);
            setExams(exams.map((exam) => (exam._id === examId ? updatedExam : exam)));
            toast.success("Exam activated successfully!");
        } catch (error) {
            console.error("Error activating exam:", error);
            toast.error(error.message || "Failed to activate exam");
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteExam = async (examId) => {
        if (!currentUser?.school) {
            toast.error("No school associated with your account.");
            return;
        }
        setLoading(true);
        try {
            const updatedExam = await examService.completeExam(examId, currentUser.school);
            setExams(exams.map((exam) => (exam._id === examId ? updatedExam : exam)));
            toast.success("Exam completed successfully!");
        } catch (error) {
            console.error("Error completing exam:", error);
            toast.error(error.message || "Failed to complete exam");
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleExam = async (examId) => {
        if (!currentUser?.school) {
            toast.error("No school associated with your account.");
            return;
        }
        const startTime = prompt("Enter start time (YYYY-MM-DDTHH:MM):");
        const duration = prompt("Enter duration (minutes):");
        if (startTime && duration) {
            const scheduleData = {
                start: new Date(startTime).toISOString(),
                duration: parseInt(duration),
            };
            if (new Date(scheduleData.start) <= new Date()) {
                toast.error("Start time must be in the future");
                return;
            }
            if (scheduleData.duration < 5) {
                toast.error("Duration must be at least 5 minutes");
                return;
            }
            setLoading(true);
            try {
                const updatedExam = await examService.scheduleExam(examId, scheduleData, currentUser.school);
                setExams(exams.map((exam) => (exam._id === examId ? updatedExam : exam)));
                toast.success("Exam scheduled successfully!");
            } catch (error) {
                console.error("Error scheduling exam:", error);
                toast.error(error.message || "Failed to schedule exam");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteExam = async (examId) => {
        if (!currentUser?.school) {
            toast.error("No school associated with your account.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this exam?")) {
            return;
        }
        setLoading(true);
        try {
            await examService.deleteExam(examId, currentUser.school);
            setExams(exams.filter((exam) => exam._id !== examId));
            toast.success("Exam deleted successfully!");
        } catch (error) {
            console.error("Error deleting exam:", error);
            toast.error(error.message || "Failed to delete exam");
        } finally {
            setLoading(false);
        }
    };

    // Calculate total points
    const calculateTotalPoints = (questions) => {
        return questions?.reduce((sum, q) => sum + (parseInt(q.maxScore) || 0), 0) || 0;
    };

    // Debounced search handler
    const debouncedSetSearchTerm = debounce((value) => setSearchTerm(value), 300);

    // Filter and sort exams
    const filteredExams = useMemo(() => {
        return exams.filter((exam) => {
            const matchesStatus = filterStatus === "all" || exam.status === filterStatus;
            const matchesSearch =
                searchTerm === "" ||
                exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (exam.subject?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSubject = !selectedSubject || exam.subject?._id === selectedSubject.value;
            const matchesClass = !selectedClass || exam.classes?.some((c) => c._id === selectedClass.value);
            return matchesStatus && matchesSearch && matchesSubject && matchesClass;
        });
    }, [exams, filterStatus, searchTerm, selectedSubject, selectedClass]);

    const sortedExams = useMemo(() => {
        const statusOrder = { draft: 0, scheduled: 1, active: 2, completed: 3 };
        return [...filteredExams].sort((a, b) => {
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [filteredExams]);

    return (
        <Layout>
            <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <FaBook className="h-6 sm:h-8 w-6 sm:w-8 text-indigo-600" aria-hidden="true" />
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Exam Management</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search exams..."
                                className="pl-10 pr-4 py-2 w-full bg-gray-50 border border-indigo-300 rounded-full text-sm sm:text-base text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                                aria-label="Search exams"
                            />
                        </div>
                        <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                            <div ref={subjectDropdownRef} className="relative w-full sm:w-auto">
                                <button
                                    className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-gray-50 border border-indigo-300 rounded-md text-sm sm:text-base text-gray-700 w-full sm:min-w-[140px] hover:bg-indigo-50 transition duration-200"
                                    onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                                    aria-label="Select subject filter"
                                    aria-expanded={showSubjectDropdown}
                                >
                                    <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                                    {selectedSubject?.label || "Subject"}
                                    <FaChevronDown
                                        className={`h-4 sm:h-5 w-4 sm:w-5 text-indigo-600 transition-transform ${showSubjectDropdown ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {showSubjectDropdown && (
                                    <div
                                        className="absolute top-full left-0 mt-2 w-full bg-white border border-indigo-200 rounded-lg shadow-xl z-20 overflow-hidden transition-all duration-200"
                                    >
                                        <button
                                            className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${!selectedSubject ? "bg-indigo-50 text-indigo-600 font-medium" : "hover:bg-indigo-50"}`}
                                            onClick={() => {
                                                setSelectedSubject(null);
                                                setShowSubjectDropdown(false);
                                            }}
                                        >
                                            <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                                            All Subjects
                                        </button>
                                        {subjectOptionsList.map((opt) => (
                                            <button
                                                key={opt.value}
                                                className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${selectedSubject?.value === opt.value ? "bg-indigo-50 text-indigo-600 font-medium" : "hover:bg-indigo-50"}`}
                                                onClick={() => {
                                                    setSelectedSubject(opt);
                                                    setShowSubjectDropdown(false);
                                                }}
                                            >
                                                <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div ref={classDropdownRef} className="relative w-full sm:w-auto">
                                <button
                                    className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-gray-50 border border-indigo-300 rounded-md text-sm sm:text-base text-gray-700 w-full sm:min-w-[140px] hover:bg-indigo-50 transition duration-200"
                                    onClick={() => setShowClassDropdown(!showClassDropdown)}
                                    aria-label="Select class filter"
                                    aria-expanded={showClassDropdown}
                                >
                                    <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                                    {selectedClass?.label || "Class"}
                                    <FaChevronDown
                                        className={`h-4 sm:h-5 w-4 sm:w-5 text-indigo-600 transition-transform ${showClassDropdown ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {showClassDropdown && (
                                    <div
                                        className="absolute top-full left-0 mt-2 w-full bg-white border border-indigo-200 rounded-lg shadow-xl z-20 overflow-hidden transition-all duration-200"
                                    >
                                        <button
                                            className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${!selectedClass ? "bg-indigo-50 text-indigo-600 font-medium" : "hover:bg-indigo-50"}`}
                                            onClick={() => {
                                                setSelectedClass(null);
                                                setShowClassDropdown(false);
                                            }}
                                        >
                                            <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                                            All Classes
                                        </button>
                                        {classOptionsList.map((opt) => (
                                            <button
                                                key={opt.value}
                                                className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${selectedClass?.value === opt.value ? "bg-indigo-50 text-indigo-600 font-medium" : "hover:bg-indigo-50"}`}
                                                onClick={() => {
                                                    setSelectedClass(opt);
                                                    setShowClassDropdown(false);
                                                }}
                                            >
                                                <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {currentUser?.role === "teacher" && (
                                <Button
                                    as={Link}
                                    to="/teacher/exams/create"
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base font-medium shadow-md w-full sm:w-auto"
                                    aria-label="Create new exam"
                                >
                                    <FaPlus className="h-4 sm:h-5 w-4 sm:w-5" />
                                    Create Exam
                                </Button>
                            )}
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
                                        { status: "all", label: "All", icon: FaFilter },
                                        { status: "draft", label: "Draft", icon: FaFileAlt },
                                        { status: "scheduled", label: "Scheduled", icon: FaCalendar },
                                        { status: "active", label: "Active", icon: FaPlayCircle },
                                        { status: "completed", label: "Completed", icon: FaCheckCircle },
                                    ].map(({ status, label, icon: Icon }) => (
                                        <Button
                                            key={status}
                                            variant={filterStatus === status ? "primary" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                setFilterStatus(status);
                                                setShowFilterMenu(false);
                                            }}
                                            className={`flex items-center gap-2 w-full justify-start px-3 sm:px-4 py-2 text-sm sm:text-base ${filterStatus === status ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border-indigo-300 text-indigo-600 hover:bg-indigo-50"} rounded-none`}
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
                        ) : sortedExams.length === 0 ? (
                            <Card className="bg-gray-50 border-indigo-200 w-full max-w-3xl mx-auto">
                                <div className="p-6 sm:p-8 text-center">
                                    <div className="text-4xl sm:text-5xl mb-4">📚</div>
                                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">No Exams Found</h3>
                                    <p className="text-sm sm:text-base text-gray-600 mb-6">
                                        {searchTerm || filterStatus !== "all" || selectedSubject || selectedClass
                                            ? "Try adjusting your search or filter settings."
                                            : "Start by creating your first exam!"}
                                    </p>
                                    {currentUser?.role === "teacher" && (
                                        <Button
                                            as={Link}
                                            to="/teacher/exams/create"
                                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base font-medium shadow-md w-full sm:w-auto mx-auto"
                                            aria-label="Create new exam"
                                        >
                                            <FaPlus className="h-4 sm:h-5 w-4 sm:w-5" />
                                            Create New Exam
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                                {sortedExams.slice(0, visibleExams).map((exam) => (
                                    <div
                                        key={exam._id}
                                        className="bg-gray-50 border-indigo-200 hover:border-indigo-300 transition-all duration-200"
                                    >
                                        <ExamCard
                                            examId={exam._id}
                                            title={exam.title}
                                            subject={exam.subject?.name || "Unknown Subject"}
                                            classCode={
                                                Array.isArray(exam.classes) && exam.classes.length > 0
                                                    ? exam.classes
                                                        .map((c) => c.className || `${c.level}${c.trade?.code || ""}`)
                                                        .join(", ")
                                                    : "No class assigned"
                                            }
                                            description={exam.instructions || `${exam.type.charAt(0).toUpperCase() + exam.type.slice(1)} - ${exam.status}`}
                                            status={exam.status}
                                            statusBadge={
                                                <span
                                                    className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium ${exam.status === "draft"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : exam.status === "scheduled"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : exam.status === "active"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-gray-100 text-gray-800"
                                                        }`}
                                                >
                                                    {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                                                </span>
                                            }
                                            startTime={
                                                exam.schedule?.start
                                                    ? new Date(exam.schedule.start).toLocaleString("en-US", {
                                                        dateStyle: "medium",
                                                        timeStyle: "short",
                                                    })
                                                    : "Not scheduled"
                                            }
                                            endTime={
                                                exam.schedule?.start && exam.schedule?.duration
                                                    ? new Date(
                                                        new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000
                                                    ).toLocaleString("en-US", {
                                                        dateStyle: "medium",
                                                        timeStyle: "short",
                                                    })
                                                    : "Not scheduled"
                                            }
                                            questions={exam.questions?.length || 0}
                                            totalPoints={calculateTotalPoints(exam.questions)}
                                            userRole={currentUser?.role || "teacher"}
                                            actions={[
                                                ...(exam.status === "draft"
                                                    ? [
                                                        {
                                                            label: "Schedule",
                                                            onClick: () => handleScheduleExam(exam._id),
                                                            icon: <FaCalendar className="h-3 sm:h-4 w-3 sm:w-4" />,
                                                            className: "bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1",
                                                        },
                                                        {
                                                            label: "Edit",
                                                            onClick: () => navigate(`/teacher/exams/${exam._id}/edit`),
                                                            icon: <FaEdit className="h-3 sm:h-4 w-3 sm:w-4" />,
                                                            className: "bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1",
                                                        },
                                                    ]
                                                    : []),
                                                ...(exam.status === "scheduled"
                                                    ? [
                                                        {
                                                            label: "Activate",
                                                            onClick: () => handleActivateExam(exam._id),
                                                            icon: <FaPlayCircle className="h-3 sm:h-4 w-3 sm:w-4" />,
                                                            className: "bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1",
                                                        },
                                                        {
                                                            label: "Edit",
                                                            onClick: () => navigate(`/teacher/exams/${exam._id}/edit`),
                                                            icon: <FaEdit className="h-3 sm:h-4 w-3 sm:w-4" />,
                                                            className: "bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1",
                                                        },
                                                    ]
                                                    : []),
                                                ...(exam.status === "active"
                                                    ? [
                                                        {
                                                            label: "Complete",
                                                            onClick: () => handleCompleteExam(exam._id),
                                                            icon: <FaCheckCircle className="h-3 sm:h-4 w-3 sm:w-4" />,
                                                            className: "bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1",
                                                        },
                                                        {
                                                            label: "View Submissions",
                                                            onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`),
                                                            icon: <FaEye className="h-3 sm:h-4 w-3 sm:w-4" />,
                                                            className: "bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1",
                                                        },
                                                    ]
                                                    : []),
                                                ...(exam.status === "completed"
                                                    ? [
                                                        {
                                                            label: "View Submissions",
                                                            onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`),
                                                            icon: <FaEye className="h-3 sm:h-4 w-3 sm:w-4" />,
                                                            className: "bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1",
                                                        },
                                                    ]
                                                    : []),
                                                {
                                                    label: "Delete",
                                                    onClick: () => handleDeleteExam(exam._id),
                                                    icon: <FaTrash className="h-3 sm:h-4 w-3 sm:w-4" />,
                                                    variant: "danger",
                                                    className: "bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1",
                                                },
                                            ]}
                                            className="m-2 sm:m-4 p-2 sm:p-4"
                                        />
                                    </div>
                                ))}
                                {sortedExams.length > visibleExams && (
                                    <div className="col-span-full text-center mt-4">
                                        <Button
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 text-sm sm:text-base"
                                            onClick={() => setVisibleExams((prev) => prev + 10)}
                                            aria-label="Show more exams"
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
                                    { status: "all", label: "All", icon: FaFilter },
                                    { status: "draft", label: "Draft", icon: FaFileAlt },
                                    { status: "scheduled", label: "Scheduled", icon: FaCalendar },
                                    { status: "active", label: "Active", icon: FaPlayCircle },
                                    { status: "completed", label: "Completed", icon: FaCheckCircle },
                                ].map(({ status, label, icon: Icon }) => (
                                    <Button
                                        key={status}
                                        variant={filterStatus === status ? "primary" : "outline"}
                                        size="sm"
                                        onClick={() => setFilterStatus(status)}
                                        className={`flex items-center gap-2 w-full justify-start px-3 sm:px-4 py-2 text-sm sm:text-base ${filterStatus === status ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border-indigo-300 text-indigo-600 hover:bg-indigo-50"} rounded-md`}
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
        </Layout>
    );
};

export default ExamManagement;