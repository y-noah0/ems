import React, { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import examService from "../services/examService";
import submissionService from "../services/submissionService";
import { motion, AnimatePresence } from "framer-motion";
import TestNotificationButton from "../components/TestNotificationButton";
import {
    FiCalendar,
    FiClock,
    FiBookOpen,
    FiUser,
    FiClipboard,
    FiCheckCircle,
    FiBarChart2,
    FiUserCheck,
    FiActivity,
} from "react-icons/fi";

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 1) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.15, ease: "easeOut", duration: 0.5 },
    }),
};

const StudentDashboard = () => {
    const { currentUser } = useAuth();
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const schoolId = currentUser?.school;

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!schoolId) {
                setError(
                    "School ID is missing. Please ensure you are logged in with a valid school."
                );
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const examsData = await examService.getUpcomingExamsForStudent(schoolId);
                setUpcomingExams(examsData);

                const submissionsData = await submissionService.getStudentSubmissions(
                    schoolId
                );
                setRecentSubmissions(submissionsData.slice(0, 5));
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setError("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [schoolId]);

    return (
        <Layout>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10 select-none"
            >
                <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
                    <FiActivity className="text-blue-600" size={36} />
                    Student Dashboard
                </h1>
                <p className="mt-3 text-xl text-gray-700">
                    Welcome back,{" "}
                    <span className="font-semibold text-blue-700">{currentUser?.fullName}</span>
                </p>
            </motion.div>

            {/* Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-center py-12"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="h-14 w-14 border-4 border-blue-600 border-t-transparent rounded-full"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
                {!loading && error && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-red-50 border border-red-300 text-red-800 px-6 py-4 rounded-lg font-semibold shadow-sm max-w-3xl mx-auto"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-7xl mx-auto">
                    {/* Upcoming Exams */}
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                    >
                        <Card title={<><FiCalendar className="inline text-blue-600 mr-2" size={22} />Upcoming Exams</>}>
                            {upcomingExams.length === 0 ? (
                                <p className="text-gray-500 italic select-none">
                                    No upcoming exams scheduled.
                                </p>
                            ) : (
                                <div className="space-y-6">
                                    {upcomingExams.map((exam) => (
                                        <motion.div
                                            key={exam._id}
                                            whileHover={{ scale: 1.03, boxShadow: "0 10px 15px rgba(59,130,246,0.3)" }}
                                            className="border border-gray-200 rounded-lg p-5 bg-white shadow cursor-pointer transition-transform duration-300"
                                            onClick={() => window.location.assign(`/student/exams/${exam._id}`)}
                                        >
                                            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                                <FiBookOpen className="text-blue-500" /> {exam.title}
                                            </h3>
                                            <div className="mt-2 text-sm text-gray-600 space-y-1 select-none">
                                                <p>
                                                    <FiClipboard className="inline mr-1" />{" "}
                                                    <strong>Subject:</strong> {exam.subject?.name || "N/A"}
                                                </p>
                                                <p>
                                                    <FiCalendar className="inline mr-1" />{" "}
                                                    <strong>Date:</strong>{" "}
                                                    {exam.schedule?.start
                                                        ? new Date(exam.schedule.start).toLocaleDateString(undefined, {
                                                            weekday: "short",
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                        })
                                                        : "N/A"}
                                                </p>
                                                <p>
                                                    <FiClock className="inline mr-1" />{" "}
                                                    <strong>Time:</strong>{" "}
                                                    {exam.schedule?.start
                                                        ? new Date(exam.schedule.start).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })
                                                        : "N/A"}
                                                </p>
                                                <p>
                                                    <FiClock className="inline mr-1" />{" "}
                                                    <strong>Duration:</strong>{" "}
                                                    {exam.schedule?.duration ? `${exam.schedule.duration} minutes` : "N/A"}
                                                </p>
                                                <p>
                                                    <FiUser className="inline mr-1" />{" "}
                                                    <strong>Teacher:</strong> {exam.teacher?.fullName || "N/A"}
                                                </p>
                                            </div>
                                            <div className="mt-4 text-right">
                                                <Button
                                                    as={Link}
                                                    to={`/student/exams/${exam._id}`}
                                                    variant="primary"
                                                    size="sm"
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 text-center">
                                <Button as={Link} to="/student/exams" variant="secondary" size="sm">
                                    View All Exams
                                </Button>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Recent Submissions */}
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                    >
                        <Card title={<><FiCheckCircle className="inline text-green-600 mr-2" size={22} />Recent Submissions</>}>
                            {recentSubmissions.length === 0 ? (
                                <p className="text-gray-500 italic select-none">No recent exam submissions.</p>
                            ) : (
                                <div className="space-y-5">
                                    {recentSubmissions.map((submission) => (
                                        <motion.div
                                            key={submission._id}
                                            whileHover={{ scale: 1.03, boxShadow: "0 10px 15px rgba(34,197,94,0.3)" }}
                                            className="border border-gray-200 rounded-lg p-5 bg-white shadow cursor-pointer transition-transform duration-300"
                                            onClick={() =>
                                                submission.exam &&
                                                window.location.assign(`/student/submissions/${submission._id}`)
                                            }
                                        >
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <FiClipboard className="text-green-600" />{" "}
                                                {submission.exam ? submission.exam.title : "Exam Deleted"}
                                            </h3>
                                            <div className="mt-1 text-sm text-gray-600 space-y-1 select-none">
                                                <p>
                                                    <FiBookOpen className="inline mr-1" />{" "}
                                                    <strong>Subject:</strong>{" "}
                                                    {submission.exam?.subject?.name || "N/A"}
                                                </p>
                                                <p>
                                                    <FiClock className="inline mr-1" />{" "}
                                                    <strong>Submitted:</strong>{" "}
                                                    {submission.submittedAt
                                                        ? new Date(submission.submittedAt).toLocaleString()
                                                        : "N/A"}
                                                </p>
                                                <p>
                                                    <FiBarChart2 className="inline mr-1" />{" "}
                                                    <strong>Score:</strong>{" "}
                                                    {submission.status === "graded" &&
                                                        submission.totalScore !== undefined &&
                                                        submission.exam?.totalScore !== undefined
                                                        ? `${submission.totalScore} / ${submission.exam.totalScore}`
                                                        : "Pending"}
                                                </p>
                                            </div>
                                            <div className="mt-4 text-right">
                                                <Button
                                                    as={Link}
                                                    to={`/student/submissions/${submission._id}`}
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={!submission.exam}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 text-center">
                                <Button as={Link} to="/student/results" variant="secondary" size="sm">
                                    View All Results
                                </Button>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Academic Progress */}
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={3}
                    >
                        <Card title={<><FiBarChart2 className="inline text-purple-600 mr-2" size={22} />Academic Progress</>}>
                            <div className="text-center py-14 select-none">
                                <Link to="/student/results">
                                    <Button variant="primary" size="md" className="uppercase tracking-wide">
                                        View Performance Report
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Profile Information */}
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={4}
                    >
                        <Card title={<><FiUserCheck className="inline text-indigo-600 mr-2" size={22} />Profile Information</>}>
                            <div className="space-y-4 select-none text-gray-800">
                                <div className="flex justify-between font-semibold">
                                    <span>Full Name:</span>
                                    <span>{currentUser?.fullName || "N/A"}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span>Registration Number:</span>
                                    <span>{currentUser?.registrationNumber || "N/A"}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span>Email:</span>
                                    <span>{currentUser?.email || "N/A"}</span>
                                </div>
                                {currentUser?.class && (
                                    <div className="flex justify-between font-semibold">
                                        <span>Class:</span>
                                        <span>{`${currentUser.class.level || ""}${currentUser.class.trade || ""}` || "N/A"}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 text-center">
                                <Button as={Link} to="/student/profile" variant="secondary" size="sm">
                                    Edit Profile
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
            
            {/* Test Notification Button - only show in development */}
            {window.location.hostname === 'localhost' && <TestNotificationButton />}
        </Layout>
    );
};

export default StudentDashboard;
