
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
          ? subjectsData.map((s) => ({ value: s._id, label: s.name || "Unnamed Subject" }))
          : []
      );
      setClassOptionsList(
        Array.isArray(classesData)
          ? classesData.map((c) => ({
              value: c._id,
              label: c.className || `${ c.level }${ c.trade?.code || "" } ` || "Unnamed Class",
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
    return Array.isArray(questions) ? questions.reduce((sum, q) => sum + (parseInt(q.maxScore) || 0), 0) : 0;
  };

  // Debounced search handler
  const debouncedSetSearchTerm = debounce((value) => setSearchTerm(value), 300);

  // Filter and sort exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesStatus = filterStatus === "all" || exam.status === filterStatus;
      const matchesSearch =
        searchTerm === "" ||
        (exam.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        className="p-4 sm:p-6 w-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4"
          variants={cardVariants}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <FaBook className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Exam Management</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-blue-400" />
              <input
                type="text"
                placeholder="Search exams..."
                className="pl-10 pr-4 py-2 w-full bg-white border border-blue-200 rounded-full text-sm sm:text-base text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-300 shadow-sm"
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                aria-label="Search exams"
              />
            </div>
            <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
              <div ref={subjectDropdownRef} className="relative w-full sm:w-auto">
                <motion.button
                  className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm sm:text-base text-gray-800 w-full sm:min-w-[140px] hover:bg-blue-50 transition duration-300 shadow-sm"
                  onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                  aria-label="Select subject filter"
                  aria-expanded={showSubjectDropdown}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                  {selectedSubject?.label || "Subject"}
                  <FaChevronDown
                    className={`h - 4 sm: h - 5 w - 4 sm: w - 5 text - blue - 600 transition - transform ${ showSubjectDropdown ? "rotate-180" : "" } `}
                  />
                </motion.button>
                <AnimatePresence>
                  {showSubjectDropdown && (
                    <motion.div
                      className="absolute top-full left-0 mt-2 w-full bg-white border border-blue-200 rounded-lg shadow-lg z-20 overflow-hidden"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.button
                        className={`block w - full text - left px - 3 sm: px - 4 py - 2 text - sm sm: text - base flex items - center gap - 2 ${ !selectedSubject ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-blue-50" } `}
                        onClick={() => {
                          setSelectedSubject(null);
                          setShowSubjectDropdown(false);
                        }}
                        whileHover={{ backgroundColor: "#EEF2FF" }}
                      >
                        <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                        All Subjects
                      </motion.button>
                      {subjectOptionsList.map((opt) => (
                        <motion.button
                          key={opt.value}
                          className={`block w - full text - left px - 3 sm: px - 4 py - 2 text - sm sm: text - base flex items - center gap - 2 ${ selectedSubject?.value === opt.value ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-blue-50" } `}
                          onClick={() => {
                            setSelectedSubject(opt);
                            setShowSubjectDropdown(false);
                          }}
                          whileHover={{ backgroundColor: "#EEF2FF" }}
                        >
                          <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                          {opt.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div ref={classDropdownRef} className="relative w-full sm:w-auto">
                <motion.button
                  className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm sm:text-base text-gray-800 w-full sm:min-w-[140px] hover:bg-blue-50 transition duration-300 shadow-sm"
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  aria-label="Select class filter"
                  aria-expanded={showClassDropdown}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                  {selectedClass?.label || "Class"}
                  <FaChevronDown
                    className={`h - 4 sm: h - 5 w - 4 sm: w - 5 text - blue - 600 transition - transform ${ showClassDropdown ? "rotate-180" : "" } `}
                  />
                </motion.button>
                <AnimatePresence>
                  {showClassDropdown && (
                    <motion.div
                      className="absolute top-full left-0 mt-2 w-full bg-white border border-blue-200 rounded-lg shadow-lg z-20 overflow-hidden"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.button
                        className={`block w - full text - left px - 3 sm: px - 4 py - 2 text - sm sm: text - base flex items - center gap - 2 ${ !selectedClass ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-blue-50" } `}
                        onClick={() => {
                          setSelectedClass(null);
                          setShowClassDropdown(false);
                        }}
                        whileHover={{ backgroundColor: "#EEF2FF" }}
                      >
                        <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                        All Classes
                      </motion.button>
                      {classOptionsList.map((opt) => (
                        <motion.button
                          key={opt.value}
                          className={`block w - full text - left px - 3 sm: px - 4 py - 2 text - sm sm: text - base flex items - center gap - 2 ${ selectedClass?.value === opt.value ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-blue-50" } `}
                          onClick={() => {
                            setSelectedClass(opt);
                            setShowClassDropdown(false);
                          }}
                          whileHover={{ backgroundColor: "#EEF2FF" }}
                        >
                          <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                          {opt.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {currentUser?.role === "teacher" && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    as={Link}
                    to="/teacher/exams/create"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base font-medium shadow-md transition duration-300 w-full sm:w-auto"
                    aria-label="Create new exam"
                  >
                    <FaPlus className="h-4 sm:h-5 w-4 sm:w-5" />
                    Create Exam
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div className="flex flex-col sm:flex-row gap-4 sm:gap-6" variants={cardVariants}>
          <div className="sm:hidden mb-4">
            <div ref={filterMenuRef} className="relative">
              <motion.button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 w-full shadow-sm transition duration-300"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
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
                      { status: "all", label: "All", icon: FaFilter },
                      { status: "draft", label: "Draft", icon: FaFileAlt },
                      { status: "scheduled", label: "Scheduled", icon: FaCalendar },
                      { status: "active", label: "Active", icon: FaPlayCircle },
                      { status: "completed", label: "Completed", icon: FaCheckCircle },
                    ].map(({ status, label, icon: Icon }) => (
                      <motion.button
                        key={status}
                        className={`flex items - center gap - 2 w - full justify - start px - 3 sm: px - 4 py - 2 text - sm sm: text - base ${ filterStatus === status ? "bg-blue-600 text-white hover:bg-blue-700" : "text-blue-600 hover:bg-blue-50" } rounded - none`}
                        onClick={() => {
                          setFilterStatus(status);
                          setShowFilterMenu(false);
                        }}
                        aria-label={`Filter by ${ label } `}
                        whileHover={{ backgroundColor: filterStatus === status ? "#4F46E5" : "#EEF2FF" }}
                      >
                        <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
                        {label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex-1">
            {loading ? (
              <motion.div
                className="flex justify-center items-center py-12 sm:py-16 min-h-[40vh]"
                variants={cardVariants}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FaSpinner className="h-10 sm:h-12 w-10 sm:w-12 text-blue-600" aria-hidden="true" />
                </motion.div>
              </motion.div>
            ) : sortedExams.length === 0 ? (
              <motion.div variants={cardVariants}>
                <Card className="bg-white border border-blue-200 w-full max-w-3xl mx-auto shadow-md rounded-lg">
                  <div className="p-6 sm:p-8 text-center">
                    <motion.div
                      className="text-4xl sm:text-5xl mb-4 text-blue-600"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                    >
                      📚
                    </motion.div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">No Exams Found</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-6">
                      {searchTerm || filterStatus !== "all" || selectedSubject || selectedClass
                        ? "Try adjusting your search or filter settings."
                        : "Start by creating your first exam!"}
                    </p>
                    {currentUser?.role === "teacher" && (
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          as={Link}
                          to="/teacher/exams/create"
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base font-medium shadow-md transition duration-300 w-full sm:w-auto mx-auto"
                          aria-label="Create new exam"
                        >
                          <FaPlus className="h-4 sm:h-5 w-4 sm:w-5" />
                          Create New Exam
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                variants={containerVariants}
              >
                {sortedExams.slice(0, visibleExams).map((exam) => (
                  <motion.div
                    key={exam._id}
                    className="bg-white border border-blue-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02 }}
                  >
                    <ExamCard
                      examId={exam._id}
                      title={exam.title || "Untitled Exam"}
                      subject={exam.subject?.name || "Unknown Subject"}
                      classCode={
                        Array.isArray(exam.classes) && exam.classes.length > 0
                          ? exam.classes
                              .map((c) => c.className || `${ c.level }${ c.trade?.code || "" } `)
                              .join(", ")
                          : "No class assigned"
                      }
                      description={
                        exam.instructions ||
                        (exam.type
                          ? `${ (exam.type || "quiz").charAt(0).toUpperCase() + (exam.type || "quiz").slice(1) } - ${ exam.status || "unknown" } `
                          : `Exam - ${ exam.status || "unknown" } `)
                      }
                      status={exam.status || "unknown"}
                      statusBadge={
                        <span
                          className={`inline - flex items - center px - 2 sm: px - 2.5 py - 0.5 rounded - full text - xs sm: text - sm font - medium ${
    exam.status === "draft"
        ? "bg-yellow-100 text-yellow-800"
        : exam.status === "scheduled"
            ? "bg-blue-100 text-blue-800"
            : exam.status === "active"
                ? "bg-green-100 text-green-800"
                : exam.status === "completed"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-gray-100 text-gray-800"
} `}
                        >
                          {(exam.status || "unknown").charAt(0).toUpperCase() + (exam.status || "unknown").slice(1)}
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
                                icon: <FaCalendar className="h-4 w-4" />,
                                className:
                                  "flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm px-3 py-1.5 rounded-md",
                              },
                              {
                                label: "Edit",
                                onClick: () => navigate(`/ teacher / exams / ${ exam._id }/edit`),
icon: <FaEdit className="h-4 w-4" />,
    className:
"flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm px-3 py-1.5 rounded-md",
                              },
                            ]
                          : []),
                        ...(exam.status === "scheduled"
    ? [
        {
            label: "Activate",
            onClick: () => handleActivateExam(exam._id),
            icon: <FaPlayCircle className="h-4 w-4" />,
            className:
                "flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-md",
        },
        {
            label: "Edit",
            onClick: () => navigate(`/teacher/exams/${exam._id}/edit`),
            icon: <FaEdit className="h-4 w-4" />,
            className:
                "flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm px-3 py-1.5 rounded-md",
        },
    ]
    : []),
                        ...(exam.status === "active"
    ? [
        {
            label: "Complete",
            onClick: () => handleCompleteExam(exam._id),
            icon: <FaCheckCircle className="h-4 w-4" />,
            className:
                "flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm px-3 py-1.5 rounded-md",
        },
        {
            label: "View Submissions",
            onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`),
            icon: <FaEye className="h-4 w-4" />,
            className:
                "flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm px-3 py-1.5 rounded-md",
        },
    ]
    : []),
                        ...(exam.status === "completed"
    ? [
        {
            label: "View Submissions",
            onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`),
            icon: <FaEye className="h-4 w-4" />,
            className:
                "flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm px-3 py-1.5 rounded-md",
        },
    ]
    : []),
{
    label: "Delete",
    onClick: () => handleDeleteExam(exam._id),
    icon: <FaTrash className="h-4 w-4" />,
    className:
        "flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-md",
},
                      ]}
className = "p-4 sm:p-5"
    />
                  </motion.div >
                ))}
{
    sortedExams.length > visibleExams && (
        <motion.div className="col-span-full text-center mt-6" variants={cardVariants}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 text-sm sm:text-base font-medium shadow-md transition duration-300"
                    onClick={() => setVisibleExams((prev) => prev + 10)}
                    aria-label="Show more exams"
                >
                    Show More
                </Button>
            </motion.div>
        </motion.div>
    )
}
              </motion.div >
            )}
          </div >
    <motion.div className="hidden sm:block w-full sm:w-60" variants={cardVariants}>
        <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-4">
                <FaFilter className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-600">Filters</h3>
            </div>
            <div className="flex flex-col gap-2">
                {[
                    { status: "all", label: "All", icon: FaFilter },
                    { status: "draft", label: "Draft", icon: FaFileAlt },
                    { status: "scheduled", label: "Scheduled", icon: FaCalendar },
                    { status: "active", label: "Active", icon: FaPlayCircle },
                    { status: "completed", label: "Completed", icon: FaCheckCircle },
                ].map(({ status, label, icon: Icon }) => (
                    <motion.div key={status} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant={filterStatus === status ? "primary" : "outline"}
                            className={`flex items-center gap-2 w-full justify-start px-4 py-2 text-sm sm:text-base ${filterStatus === status
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "border-blue-200 text-blue-600 hover:bg-blue-50"
                                } rounded-lg shadow-sm transition duration-300`}
                            onClick={() => setFilterStatus(status)}
                            aria-label={`Filter by ${label}`}
                        >
                            <Icon className="h-5 w-5" />
                            {label}
                        </Button>
                    </motion.div>
                ))}
            </div>
        </div>
    </motion.div>
        </motion.div >
      </motion.div >
    </Layout >
  );
};

export default ExamManagement;
