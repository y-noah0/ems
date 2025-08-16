import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {
    FaSearch,
    FaPlus,
    FaBook,
    FaUsers,
    FaFilter,
    FaTrash,
    FaEdit,
    FaEye,
    FaCalendar,
    FaPlayCircle,
    FaCheckCircle,
    FaFileAlt,
    FaSpinner,
    FaChevronDown,
} from "react-icons/fa";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import ExamCard from "../components/ui/ExamCard";
import examService from "../services/examService";
import submissionService from "../services/submissionService";
import { useNavigate } from 'react-router-dom';

const StudentExams = () => {
    const location = useLocation();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
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
    console.log(exams);
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
            if (
                subjectDropdownRef.current &&
                !subjectDropdownRef.current.contains(event.target)
            ) {
                setShowSubjectDropdown(false);
            }
            if (
                classDropdownRef.current &&
                !classDropdownRef.current.contains(event.target)
            ) {
                setShowClassDropdown(false);
            }
            if (
                filterMenuRef.current &&
                !filterMenuRef.current.contains(event.target)
            ) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
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
            toast.error(
                "No school associated with your account. Please log in again."
            );
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            if (currentUser.role === 'student') {
                // Fetch class (scheduled/active), upcoming (redundant safety), and past (completed) exams + submissions
                const [classExams, upcomingExams, pastExams, submissions] = await Promise.all([
                    examService.getStudentClassExams(currentUser.school).catch(() => []),
                    examService.getUpcomingExamsForStudent(currentUser.school).catch(() => []),
                    examService.getPastExamsForStudent(currentUser.school).catch(() => []),
                    submissionService.getStudentSubmissions(currentUser.school).catch(() => [])
                ]);
                console.debug('Fetched exams (class/upcoming/past):', { classCount: classExams?.length, upcomingCount: upcomingExams?.length, pastCount: pastExams?.length });
                const byId = new Map();
                const addList = (list)=>{ Array.isArray(list) && list.forEach(ex=>{ if (ex && ex._id && !byId.has(ex._id)) byId.set(ex._id, ex); }); };
                addList(classExams); addList(upcomingExams); addList(pastExams);
                // Normalize status if missing / inferred
                const now = new Date();
                const normalized = Array.from(byId.values()).map(ex => {
                    if (!ex.status) {
                        if (ex.schedule?.start) {
                            const start = new Date(ex.schedule.start);
                            const end = ex.schedule?.duration ? new Date(start.getTime() + ex.schedule.duration * 60000) : null;
                            if (end && now > end) ex.status = 'completed';
                            else if (start > now) ex.status = 'scheduled';
                            else ex.status = 'active';
                        } else {
                            ex.status = 'scheduled';
                        }
                    } else if (!['completed','past'].includes(ex.status) && ex.schedule?.start && ex.schedule?.duration) {
                        const start = new Date(ex.schedule.start);
                        const end = new Date(start.getTime() + ex.schedule.duration * 60000);
                        if (now > end) ex.status = 'completed';
                    }
                    return ex;
                });
                setExams(normalized);
                setSubmissionMap(() => {
                    const map = new Map();
                    Array.isArray(submissions) && submissions.forEach(sub => {
                        const examId = sub.exam?._id || sub.exam;
                        if (examId) map.set(examId, sub._id);
                    });
                    return map;
                });
            } else {
                const [examsData, subjectsData, classesData] = await Promise.all([
                    examService.getStudentClassExams(currentUser.school),
                    examService.getTeacherSubjects(currentUser.school),
                    examService.getClassesForTeacher(currentUser.school),
                ]);
                setExams(Array.isArray(examsData) ? examsData : []);
                setSubjectOptionsList(
                    Array.isArray(subjectsData)
                        ? subjectsData.map((s) => ({ value: s._id, label: s.name || 'Unnamed Subject' }))
                        : []
                );
                setClassOptionsList(
                    Array.isArray(classesData)
                        ? classesData.map((c) => ({
                            value: c._id,
                            label: c.className || `${c.level}${c.trade?.code || ''} ` || 'Unnamed Class',
                        }))
                        : []
                );
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error(error.message || 'Failed to load exams');
            setExams([]);
        } finally {
            setLoading(false);
        }
    };

    const [submissionMap, setSubmissionMap] = useState(new Map());

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Action handlers
    // Teacher-only handlers removed for student-focused view per requirement

    // Calculate total points
    const calculateTotalPoints = (questions) => {
        return Array.isArray(questions)
            ? questions.reduce((sum, q) => sum + (parseInt(q.maxScore) || 0), 0)
            : 0;
    };

    // Debounced search handler
    const debouncedSetSearchTerm = debounce(
        (value) => setSearchTerm(value),
        300
    );

    // Filter and sort exams
    const filteredExams = useMemo(() => {
        return exams.filter((exam) => {
            let matchesStatus = false;
            if (filterStatus === "all") matchesStatus = true;
            else if (filterStatus === "pending") {
                // Pending groups draft + scheduled
                matchesStatus = ["draft", "scheduled"].includes(exam.status);
            } else if (filterStatus === 'completed') {
                // Treat backend 'past' as completed for UI
                matchesStatus = ['completed','past'].includes(exam.status);
            } else {
                matchesStatus = exam.status === filterStatus;
            }
            const matchesSearch =
                searchTerm === "" ||
                (exam.title || "")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                (exam.subject?.name || "")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
            const matchesSubject =
                !selectedSubject || exam.subject?._id === selectedSubject.value;
            const matchesClass =
                !selectedClass ||
                exam.classes?.some((c) => c._id === selectedClass.value);
            return (
                matchesStatus && matchesSearch && matchesSubject && matchesClass
            );
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

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.5, staggerChildren: 0.1 },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    };

    return (
        <Layout>
            <motion.div
                className="" 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4"
                    variants={cardVariants}
                >
                    <h1 className="text-xl sm:text-xl font-bold text-gray-900">
                        Exam Management
                    </h1>
                    <div className="relative px-4 w-full sm:w-64 max-h-8 flex justify-between items-center border border-black/25 rounded-lg">
                        <input
                            type="text"
                            placeholder="Search subjects..."
                            className="py-2 w-full  text-sm placeholder:text-sm sm:text-sm text-gray-900 focus:outline-none duration-200"
                            onChange={(e) =>
                                debouncedSetSearchTerm(e.target.value)
                            }
                            aria-label="Search subjects"
                        />
                        <FaSearch className="h-4 sm:h-4 w-4 sm:w-4 text-main-gray" />
                    </div>
                    <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                            <div
                                ref={subjectDropdownRef}
                                className="relative w-full sm:w-auto"
                            >
                                <Button
                                    variant="outline"
                                    className="gap-2 transition"
                                    size="sm"
                                    onClick={() =>
                                        setShowSubjectDropdown(
                                            !showSubjectDropdown
                                        )
                                    }
                                    aria-label="Select subject filter"
                                    aria-expanded={showSubjectDropdown}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {selectedSubject?.label || "Subject"}
                                    <FaChevronDown
                                        className={` ${
                                            showSubjectDropdown
                                                ? "rotate-180"
                                                : ""
                                        } `}
                                    />
                                </Button>
                                <AnimatePresence>
                                    {showSubjectDropdown && (
                                        <motion.div
                                            className="absolute w-fit top-full left-0 mt-2 bg-white border border-black/10 rounded-lg shadow-lg z-20 overflow-hidden"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <motion.button
                                                className={`w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-sm flex items-center gap-2 ${
                                                    !selectedSubject
                                                        ? "font-medium"
                                                        : "hover:bg-black/10"
                                                } `}
                                                onClick={() => {
                                                    setSelectedSubject(null);
                                                    setShowSubjectDropdown(
                                                        false
                                                    );
                                                }}
                                                whileHover={{
                                                    backgroundColor: "#EEF2FF",
                                                }}
                                            >
                                                All
                                            </motion.button>
                                            {subjectOptionsList.map((opt) => (
                                                <motion.button
                                                    key={opt.value}
                                                    className={` w-fit text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${
                                                        selectedSubject?.value ===
                                                        opt.value
                                                            ? "bg-blue-50font-medium"
                                                            : "hover:bg-black/10"
                                                    } `}
                                                    onClick={() => {
                                                        setSelectedSubject(opt);
                                                        setShowSubjectDropdown(
                                                            false
                                                        );
                                                    }}
                                                    whileHover={{
                                                        backgroundColor:
                                                            "#EEF2FF",
                                                    }}
                                                >
                                                    {opt.label}
                                                </motion.button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div
                                ref={classDropdownRef}
                                className="relative w-full sm:w-auto"
                            >
                                <Button
                                    variant="outline"
                                    className="gap-2 transition rounded-lg"
                                    size="sm"
                                    onClick={() =>
                                        setShowClassDropdown(!showClassDropdown)
                                    }
                                    aria-label="Select class filter"
                                    aria-expanded={showClassDropdown}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {selectedClass?.label || "Class"}
                                    <FaChevronDown
                                        className={` ${
                                            showSubjectDropdown
                                                ? "rotate-180"
                                                : ""
                                        } `}
                                    />
                                </Button>
                                <AnimatePresence>
                                    {showClassDropdown && (
                                        <motion.div
                                            className="absolute w-fit top-full left-0 mt-2 bg-white border border-black/10 rounded-lg shadow-lg z-20 overflow-hidden"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <motion.button
                                                className={`w-full text-left px-3 sm:px-4 py-2 text-sm flex items-center gap-2 ${
                                                    !selectedClass
                                                        ? "font-medium"
                                                        : "hover:bg-black/10"
                                                }`}
                                                onClick={() => {
                                                    setSelectedClass(null);
                                                    setShowClassDropdown(false);
                                                }}
                                                whileHover={{
                                                    backgroundColor: "#EEF2FF",
                                                }}
                                            >
                                                All
                                            </motion.button>
                                            {classOptionsList.map((opt) => (
                                                <motion.button
                                                    key={opt.value}
                                                    className={`w-full text-left px-3 sm:px-4 py-2 text-sm flex items-center gap-2 ${
                                                        selectedClass?.value ===
                                                        opt.value
                                                            ? "bg-blue-50 font-medium"
                                                            : "hover:bg-black/10"
                                                    }`}
                                                    onClick={() => {
                                                        setSelectedClass(opt);
                                                        setShowClassDropdown(
                                                            false
                                                        );
                                                    }}
                                                    whileHover={{
                                                        backgroundColor:
                                                            "#EEF2FF",
                                                    }}
                                                >
                                                    {opt.label}
                                                </motion.button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            {currentUser?.role === "teacher" && (
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button
                                        size="sm"
                                        as={Link}
                                        to="/teacher/exams/create"
                                        aria-label="Create new exam"
                                        className="gap-2"
                                    >
                                        <FaPlus className="h-3 sm:h-3 w-3 sm:w-3" />
                                        Exam
                                    </Button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4"
                    variants={cardVariants}
                >
                    <div className="sm:hidden mb-4">
                        <div ref={filterMenuRef} className="relative">
                            <motion.button
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 w-full shadow-sm transition duration-300 text-sm"
                                onClick={() =>
                                    setShowFilterMenu(!showFilterMenu)
                                }
                                aria-label="Toggle filter menu"
                                aria-expanded={showFilterMenu}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FaFilter className="h-4 sm:h-5 w-4 sm:w-5" />
                                Filters
                            </motion.button>
                            <AnimatePresence>
                                {showFilterMenu && (
                                    <motion.div
                                        className="absolute top-full left-0 mt-2 w-full bg-white border border-blue-200 rounded-lg shadow-lg z-20 overflow-hidden"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {[
                                            { status: "all", label: "All" },
                                            { status: "draft", label: "Draft" },
                                            {
                                                status: "scheduled",
                                                label: "Scheduled",
                                            },
                                            {
                                                status: "active",
                                                label: "Active",
                                            },
                                            {
                                                status: "completed",
                                                label: "Completed",
                                            },
                                        ].map(({ status, label }) => (
                                            <motion.button
                                                key={status}
                                                className={`flex items - center gap - 2 w - full justify - start px - 3 sm: px - 4 py - 2 text - sm sm: text - base ${
                                                    filterStatus === status
                                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                                        : "text-blue-600 hover:bg-blue-50"
                                                } rounded - none`}
                                                onClick={() => {
                                                    setFilterStatus(status);
                                                    setShowFilterMenu(false);
                                                }}
                                                aria-label={`Filter by ${label} `}
                                                whileHover={{
                                                    backgroundColor:
                                                        filterStatus === status
                                                            ? "#4F46E5"
                                                            : "#EEF2FF",
                                                }}
                                            >
                                                {/* icon removed in mobile dropdown to reduce clutter */}
                                                {label}
                                            </motion.button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className="container flex-1 w-8/10">
                        {loading ? (
                            <motion.div
                                className="flex justify-center items-center py-12 sm:py-16 min-h-[40vh]"
                                variants={cardVariants}
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "linear",
                                    }}
                                >
                                    <FaSpinner
                                        className="h-10 sm:h-12 w-10 sm:w-12 text-blue-600"
                                        aria-hidden="true"
                                    />
                                </motion.div>
                            </motion.div>
                        ) : sortedExams.length === 0 ? (
                            <motion.div
                                variants={cardVariants}
                                className="flex 
                                items-center justify-center"
                            >
                                <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-center">
                                    <motion.div
                                        className="text-4xl sm:text-5xl mb-4 text-blue-600"
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            repeatType: "reverse",
                                        }}
                                    >
                                        📚
                                    </motion.div>
                                    <h3 className="text-xl sm:text-xl font-semibold text-gray-900 mb-2">
                                        No Exams Found
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 mb-6">
                                        {searchTerm ||
                                        filterStatus !== "all" ||
                                        selectedSubject ||
                                        selectedClass
                                            ? "Try adjusting your search or filter settings."
                                            : "Start by creating your first exam!"}
                                    </p>
                                    
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                className="flex flex-wrap gap-4 py-2 h-[420px] overflow-y-scroll scrollbar-hide"
                                variants={containerVariants}
                            >
                                {sortedExams
                                    .slice(0, visibleExams)
                                    .map((exam) => (
                                        <motion.div
                                            key={exam._id}
                                            className="cursor-pointer"
                                            variants={cardVariants}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            <ExamCard
                                                examId={exam._id}
                                                title={exam.title}
                                                subject={exam.subject}
                                                classCode={
                                                    Array.isArray(
                                                        exam.classes
                                                    ) && exam.classes.length > 0
                                                        ? exam.classes
                                                              .map(
                                                                  (c) =>
                                                                      c.className ||
                                                                      `${
                                                                          c.level
                                                                      }${
                                                                          c
                                                                              .trade
                                                                              ?.code ||
                                                                          ""
                                                                      }`
                                                              )
                                                              .join(", ")
                                                        : "No class assigned"
                                                }
                                                description={exam.instructions}
                                                status={exam.status}
                                                startTime={exam.schedule?.start}
                                                endTime={exam.schedule?.end}
                                                questions={
                                                    exam.questions?.length || 0
                                                }
                                                totalPoints={calculateTotalPoints(
                                                    exam.questions
                                                )}
                                                teacher={exam.teacher}
                                                type={exam.type}
                                                instructions={exam.instructions}
                                                schedule={exam.schedule}
                                                onClickOverride={currentUser.role === 'student' ? () => {
                                                    if (exam.status === 'completed' && submissionMap.has(exam._id)) {
                                                        // Align to existing plural submissions route
                                                        navigate(`/student/submissions/${submissionMap.get(exam._id)}`);
                                                    } else {
                                                        // Align to existing plural exams route
                                                        navigate(`/student/exams/${exam._id}`);
                                                    }
                                                } : undefined}
                                            />
                                        </motion.div>
                                    ))}
                                {sortedExams.length > visibleExams && (
                                    <motion.div
                                        className="col-span-full text-center mt-6"
                                        variants={cardVariants}
                                    >
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Button
                                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 text-sm sm:text-base font-medium shadow-md transition duration-300"
                                                onClick={() =>
                                                    setVisibleExams(
                                                        (prev) => prev + 10
                                                    )
                                                }
                                                aria-label="Show more exams"
                                            >
                                                Show More
                                            </Button>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </div>
                    <motion.div
                        className="hidden sm:block   w-fit"
                        variants={cardVariants}
                    >
                        <div className="sticky top-6 w-fit">
                            <div className="flex items-center gap-2 mb-4"></div>
                            <div className="flex flex-col gap-2">
                                {[
                                    { key: "all", label: "All" },
                                    { key: "active", label: "Active" },
                                    { key: "pending", label: "Pending" },
                                    { key: "completed", label: "Completed" },
                                ].map(({ key, label }) => {
                                    const base =
                                        "w-23 h-[30px] rounded-lg font-medium text-sm justify-center";
                                    const activeStyles =
                                        key === "active"
                                            ? "bg-main-blue/8 text-main-blue border border-main-blue/50"
                                            : key === "pending"
                                            ? "bg-[#ECBE3F]/8 text-[#ECBE3F] border border-[#ECBE3F]/50"
                                            : key === "completed"
                                            ? "bg-main-green/10 text-main-green border border-main-green/50"
                                            : "bg-gray-100 text-gray-600 border border-gray-200";
                                    const inactiveStyles =
                                        key === "active"
                                            ? "bg-main-blue/8 text-main-blue"
                                            : key === "pending"
                                            ? "bg-[#ECBE3F]/8 text-[#ECBE3F]"
                                            : key === "completed"
                                            ? "bg-main-green/10 text-main-green"
                                            : "bg-gray-100 text-gray-600";
                                    const applied =
                                        filterStatus === key ||
                                        (key === "pending" &&
                                            filterStatus === "pending")
                                            ? activeStyles
                                            : inactiveStyles;
                                    return (
                                        <motion.div
                                            key={key}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFilterStatus(key)
                                                }
                                                aria-label={`Filter by ${label}`}
                                                className={`flex items-center text-center ${base} ${applied} transition-colors`}
                                            >
                                                {label}
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </Layout>
    );
};

export default StudentExams;
