import React, { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import ExamCard from "../components/ui/ExamCard";
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
                
                <h1 className="text-[16px] font-bold">
                    Welcome back! <br />
                    <span className="font-light text-[16px]">{currentUser?.fullName}</span>
                </h1>
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
                        <Card className="" title={<><FiCalendar className="inline text-blue-600 mr-2" size={22} />Upcoming Exams</>}>
                            {upcomingExams.length === 0 ? (
                                <p className="text-gray-500 italic select-none">No upcoming exams scheduled.</p>
                            ) : (
                                <div className="flex flex-wrap gap-6">
                                    {upcomingExams.map((exam) => (
                                        <motion.div key={exam._id} variants={fadeUp} initial="hidden" animate="visible">
                                            <ExamCard
                                                examId={exam._id}
                                                title={exam.title}
                                                subject={exam.subject}
                                                status={exam.status}
                                                schedule={exam.schedule}
                                                questions={exam.questions}
                                                totalPoints={exam.totalScore || exam.totalPoints}
                                                teacher={exam.teacher}
                                                type={exam.type}
                                                instructions={exam.instructions}
                                            />
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
                                <div className="flex flex-wrap gap-6">
                                    {recentSubmissions.filter(s=>s.exam).map((submission) => {
                                        const exam = submission.exam;
                                        const progress = (submission.status === 'graded' && submission.totalScore && exam.totalScore)
                                            ? Math.min(100, Math.round((submission.totalScore / exam.totalScore) * 100))
                                            : 0;
                                        return (
                                            <motion.div key={submission._id} variants={fadeUp} initial="hidden" animate="visible">
                                                <ExamCard
                                                    examId={exam._id}
                                                    title={exam.title}
                                                    subject={exam.subject}
                                                    status={exam.status}
                                                    schedule={exam.schedule}
                                                    questions={exam.questions}
                                                    totalPoints={exam.totalScore || exam.totalPoints}
                                                    teacher={exam.teacher}
                                                    type={exam.type}
                                                    instructions={exam.instructions}
                                                    progress={progress}
                                                    onClickOverride={() => window.location.assign(`/student/submissions/${submission._id}`)}
                                                />
                                            </motion.div>
                                        );
                                    })}
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
