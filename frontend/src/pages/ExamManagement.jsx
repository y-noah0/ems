import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import examService from "../services/examService";
import ExamCard from "../components/ui/ExamCard";

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

    // Determine user role for ExamCard - default to teacher for this page
    const getUserRole = () => {
        return 'teacher'; // This is the teacher's exam management page
    };

    const subjectOptions = [
        { value: "mathematics", label: "Mathematics" },
        { value: "english", label: "English" },
        { value: "science", label: "Science" },
        { value: "history", label: "History" },
    ];

    const classOptions = [
        { value: "grade-9", label: "Grade 9" },
        { value: "grade-10", label: "Grade 10" },
        { value: "grade-11", label: "Grade 11" },
        { value: "grade-12", label: "Grade 12" },
    ];

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
        } catch (error) {
            console.error('Error fetching exams:', error);
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
        const matchesStatus =
            filterStatus === "all" || exam.status === filterStatus;
        const matchesSearch =
            searchTerm === "" ||
            exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (exam.subject?.name || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Sort exams: draft first, then active, scheduled, and finally completed
    const statusOrder = { draft: 0, scheduled: 1, active: 2, completed: 3 };
    const sortedExams = [...filteredExams].sort((a, b) => {
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Handler for activating an exam
    const handleActivate = async (examId) => {
        setLoading(true);
        setError("");
        try {
            await examService.activateExam(examId);
            await fetchExams();
        } catch (err) {
            setError(
                err?.message ||
                    err?.response?.data?.message ||
                    "Failed to activate exam"
            );
        } finally {
            setLoading(false);
        }
    };

    // Handler for completing an exam
    const handleComplete = async (examId) => {
        setLoading(true);
        setError("");
        try {
            await examService.completeExam(examId);
            await fetchExams();
        } catch (err) {
            setError(
                err?.message ||
                    err?.response?.data?.message ||
                    "Failed to complete exam"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <p className="title">Exam Management</p>
                    </div>
                    <div>
                        <div className="flex gap-3">
                            <Select
                                options={subjectOptions}
                                value={selectedSubject}
                                onChange={setSelectedSubject}
                                placeholder="Subject"
                                className="min-w-[120px]"
                            />
                            <Select
                                options={classOptions}
                                value={selectedClass}
                                onChange={setSelectedClass}
                                placeholder="Class"
                                className="min-w-[120px]"
                            />
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
                                    : "Create your first exam to get started"}
                            </p>
                            <Button as={Link} to="/teacher/exams/create">
                                Create New Exam
                            </Button>
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
