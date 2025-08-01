import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { FiChevronDown } from 'react-icons/fi';
import examService from "../services/examService";
import ExamCard from "../components/ui/ExamCard";
import { useAuth } from "../context/AuthContext";

const ExamManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
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

    // Determine user role for ExamCard - default to teacher for this page
    const userRole = useAuth().currentUser?.role 
    
    const getUserRole = () => {
        
        return userRole // This is the teacher's exam management page
    };

    // Custom dropdown click-outside handler
    useEffect(() => {
        function handleClickOutside(event) {
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
                setShowSubjectDropdown(false);
            }
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
                setShowClassDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get status from URL query parameters
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const status = queryParams.get("status");
        if (status) {
            setFilterStatus(status);
        }
    }, [location.search]);

    // Fetch exams data
    const fetchExams = async () => {
        setLoading(true);
        try {
            const examsData = await examService.getTeacherExams();
            setExams(examsData);
            // derive options
            const subjects = Array.from(new Set(examsData.map(ex => ex.subject?.name).filter(Boolean)));
            setSubjectOptionsList(subjects.map(s => ({ value: s, label: s })));
            const classes = Array.from(new Set(examsData.flatMap(ex => ex.classes?.map(c => c.name)).filter(Boolean)));
            setClassOptionsList(classes.map(cn => ({ value: cn, label: cn })));
        } catch (error) {
            console.error("Error fetching exams:", error);
            setError("Failed to load exams");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    // Filter exams based on status and search term
    const filteredExams = exams.filter((exam) => {
        const matchesStatus = filterStatus === "all" || exam.status === filterStatus;
        const matchesSearch =
            searchTerm === "" ||
            exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (exam.subject?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = !selectedSubject || exam.subject?.name === selectedSubject.value;
        const matchesClass = !selectedClass ||
            exam.classes?.some(c => `${c.level} ${c.trade.code}` === selectedClass.value);
        return matchesStatus && matchesSearch && matchesSubject && matchesClass;
    });

    // Sort exams: draft first, then active, scheduled, and finally completed
    const statusOrder = { draft: 0, scheduled: 1, active: 2, completed: 3 };
    const sortedExams = [...filteredExams].sort((a, b) => {
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });



    return (
        <Layout>
            <div className="">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <p className="title">Exam Management</p>
                    </div>
                    <div>
                        {/* Filter dropdowns */}
                        <div className="flex gap-3">
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
                                        {subjectOptionsList.map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`block w-full text-left px-4 py-2 text-sm ${selectedSubject?.value === opt.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                                                onClick={() => { setSelectedSubject(opt); setShowSubjectDropdown(false); }}
                                            >{opt.label}</button>
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
                                        {classOptionsList.map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`block w-full text-left px-4 py-2 text-sm ${selectedClass?.value === opt.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                                                onClick={() => { setSelectedClass(opt); setShowClassDropdown(false); }}
                                            >{opt.label}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                        {error}
                    </div>
                ) : sortedExams.length === 0 ? (
                    <Card>
                        <div className="p-6 text-center">
                            <h3 className="text-xl font-medium text-gray-900 mb-2">
                                No exams found
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {searchTerm || filterStatus !== "all"
                                    ? "Try changing your search criteria"
                                    : "Exams will appear here once created."}
                            </p>
                            {getUserRole() === "teacher" ? (
                                <Button as={Link} to="/teacher/exams/create">
                                    Create New Exam
                                </Button>
                            ) : (
                                ""
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <div className="flex flex-wrap gap-4 container">
                                {sortedExams.map((exam) => (
                                    <ExamCard
                                        key={exam._id}
                                        examId={exam._id}
                                        title={exam.title}
                                        subject={exam.subject?.name || ""}
                                        classCode={
                                            exam.classes?.[0]?.name || ""
                                        }
                                        description={exam.instructions}
                                        status={exam.status}
                                        startTime={new Date(
                                            exam.schedule?.start
                                        ).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                        endTime={new Date(
                                            new Date(
                                                exam.schedule?.start
                                            ).getTime() +
                                                exam.schedule?.duration * 60000
                                        ).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                        questions={exam.questions?.length || 0}
                                        totalPoints={exam.totalPoints || 0}
                                        userRole={getUserRole()}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="w-fit">
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant={
                                        filterStatus == "active"
                                            ? "primary"
                                            : "outline"
                                    }
                                    size="xs"
                                    onClick={() =>
                                        setFilterStatus(
                                            filterStatus === "active"
                                                ? "all"
                                                : "active"
                                        )
                                    }
                                >
                                    Active
                                </Button>
                                <Button
                                    variant={
                                        filterStatus == "completed"
                                            ? "primary"
                                            : "outline"
                                    }
                                    size="xs"
                                    onClick={() =>
                                        setFilterStatus(
                                            filterStatus === "completed"
                                                ? "all"
                                                : "completed"
                                        )
                                    }
                                >
                                    Completed
                                </Button>
                                <Button
                                    variant={
                                        filterStatus == "scheduled"
                                            ? "primary"
                                            : "outline"
                                    }
                                    size="xs"
                                    onClick={() =>
                                        setFilterStatus(
                                            filterStatus === "scheduled"
                                                ? "all"
                                                : "scheduled"
                                        )
                                    }
                                >
                                    Pending
                                </Button>
                                <Button
                                    variant={
                                        filterStatus == "unaproved"
                                            ? "primary"
                                            : "outline"
                                    }
                                    size="xs"
                                    onClick={() => setFilterStatus("all")}
                                >
                                    Unapproved
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
