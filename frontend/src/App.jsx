import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

// Pages imports
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import TakeExam from "./pages/TakeExam";
import DeanDashboard from "./components/dashboard/DeanDashboard";
import ClassView from "./pages/ClassView";
import SubjectsManagement from "./pages/SubjectsManagement";
import UsersManagement from "./pages/UsersManagement";
import ImportStudents from "./pages/ImportStudents";
import StudentProfile from "./pages/StudentProfile";
import StudentResults from "./pages/StudentResults";

// Teacher Pages
import TeacherDashboard from "./pages/TeacherDashboard";
import ExamCreator from "./pages/ExamCreator";
import ExamEditor from "./pages/ExamEditor";
import ExamResults from "./pages/ExamResults";
import ExamSchedule from "./pages/ExamSchedule";
import ExamsListPage from "./pages/ExamManagement";
import SubmissionsListPage from "./pages/SubmissionsListPage";
import SubmissionView from "./pages/SubmissionView";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import SystemSettings from "./pages/admin/SystemSettings";
import SystemLogs from "./pages/admin/SystemLogs";
import StudentExams from "./pages/StudentExams";
import StudentExamDetails from "./pages/StudentExamDetails";
import ClassesPage from "./components/class/ClassPage";
import PerformancePage from "./components/class/PerfomancePage";
import TeacherPage from "./components/class/TeacherPage";
import StudentPage from "./components/class/StudentPage";

import ExamDetails from "./pages/ExamDetails";
import DeanExamDetails from "./pages/Dean/ExamDetails";
import ReportingPage from "./pages/Dean/Reporting/ReportingPage";
import ClassReports from "./pages/Dean/Reporting/ClassReports";
import SchoolManagement from "./pages/admin/SchoolManagement";
import SchoolProfile from "./pages/admin/SchoolProfile";
import AddSchool from "./pages/admin/AddSchool";
import TradesCatalog from "./pages/admin/TradesCatalog";
import TradeDetail from "./pages/admin/TradeDetail";
import SubjectCatalog from "./pages/admin/SubjectCatalog";
import SubjectDetail from "./pages/admin/SubjectDetail";
import AddSubject from "./pages/admin/AddSubject";
import EditSubject from "./pages/admin/EditSubject";
import AddTrades from "./pages/admin/AddTrades";
import HeadmasterManagement from "./pages/admin/HeadmasterManagement";
import ExamManagement from "./pages/ExamManagement";
import SubscriptionManagement from "./pages/admin/SubscriptionManagement";
import HeadmasterDashboard from "./pages/Headmaster/HeadmasterDashboard";
import ClassesManagement from "./pages/ClassesManagement";
import UserManagement from "./pages/Headmaster/UserManagement";
import TradesOffered from "./pages/Headmaster/TradesOffered";
import HeadmasterSubjectCatalog from "./pages/Headmaster/SubjectCatalog";
import VerifyEmail from "./pages/VerifyEmail";
import TwoFactor from "./pages/TwoFactor";
import ExamView from "./pages/ExamView";

// Role-Based Redirect Component
const RoleBasedRedirect = () => {
    const { currentUser } = useAuth();

    if (currentUser?.role === "student") {
        return <Navigate to="/student/dashboard" replace />;
    } else if (currentUser?.role === "teacher") {
        return <Navigate to="/teacher/dashboard" replace />;
    } else if (currentUser?.role === "dean") {
        return <Navigate to="/dean/dashboard" replace />;
    } else if (currentUser?.role === "admin") {
        return <Navigate to="/admin/dashboard" replace />;
    } else if (currentUser?.role === "headmaster") {
        return <Navigate to="/headmaster/dashboard" replace />;
    } else {
        return <Navigate to="/login" replace />;
    }
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { currentUser, loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check if user role is allowed
    if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// // Global Exam Protection Wrapper (now applies to ALL routes)
const GlobalExamProtection = ({ children }) => {
    // const location = useLocation();
    // const isFullscreen = useFullscreen();

    // const [windowSize, setWindowSize] = useState({
    //   width: window.innerWidth,
    //   height: window.innerHeight,
    // });

    // useEffect(() => {
    //   function handleResize() {
    //     setWindowSize({
    //       width: window.innerWidth,
    //       height: window.innerHeight,
    //     });
    //   }
    //   window.addEventListener('resize', handleResize);
    //   return () => window.removeEventListener('resize', handleResize);
    // }, []);

    // useEffect(() => {
    //   if (!isFullscreen) {
    //     playAlert();
    //   }
    // }, [isFullscreen]);

    // const playAlert = () => {
    //   const audio = new Audio('/alert.mp3'); // Ensure alert.mp3 is in your public folder
    //   audio.play();
    // };

    // const enterFullscreen = () => {
    //   if (document.documentElement.requestFullscreen) {
    //     document.documentElement.requestFullscreen();
    //   } else if (document.documentElement.mozRequestFullScreen) {
    //     document.documentElement.mozRequestFullScreen();
    //   } else if (document.documentElement.webkitRequestFullscreen) {
    //     document.documentElement.webkitRequestFullscreen();
    //   } else if (document.documentElement.msRequestFullscreen) {
    //     document.documentElement.msRequestFullscreen();
    //   }
    // };

    // // Global checks: small screen and fullscreen
    // if (windowSize.width < 800 || windowSize.height < 600) {
    //   return (
    //     <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col justify-center items-center p-4 text-center">
    //       <h1 className="text-white text-3xl font-bold mb-4">Screen size too small!</h1>
    //       <p className="text-white mb-4">Please use a larger device.</p>
    //     </div>
    //   );
    // }

    // if (!isFullscreen) {
    //   return (
    //     <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col justify-center items-center p-4 text-center">
    //       <h1 className="text-white text-3xl font-bold mb-4">Please enter fullscreen to continue</h1>
    //       <button
    //         onClick={enterFullscreen}
    //         className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded text-lg"
    //       >
    //         Enter Fullscreen
    //       </button>
    //     </div>
    //   );
    // }

    return children;
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <ToastProvider>
                    <GlobalExamProtection>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route
                                path="/verify-email"
                                element={<VerifyEmail />}
                            />
                            <Route path="/two-factor" element={<TwoFactor />} />

                            {/* Redirect root to appropriate dashboard based on role */}
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <RoleBasedRedirect />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Redirect root to appropriate dashboard based on role */}
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <RoleBasedRedirect />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Headmaster Routes */}
                            <Route
                                path="/headmaster/dashboard"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["headmaster"]}
                                    >
                                        <HeadmasterDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/headmaster/classes"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["headmaster"]}
                                    >
                                        <ClassesManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/headmaster/trades-offered"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["headmaster"]}
                                    >
                                        <TradesOffered />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/headmaster/users"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["headmaster"]}
                                    >
                                        <UserManagement />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/headmaster/classes/performance"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["headmaster"]}
                                    >
                                        <ClassesManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/headmaster/subjects"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["headmaster"]}
                                    >
                                        <HeadmasterSubjectCatalog />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Student Routes */}
                            <Route
                                path="/student/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/take-exam/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <GlobalExamProtection>
                                            <TakeExam />
                                        </GlobalExamProtection>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/profile"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/results"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentExams />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/exams/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentExamDetails />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Teacher Routes */}
                            <Route
                                path="/teacher/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <TeacherDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamsListPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/create"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamCreator />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamView />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/edit"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamEditor />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/schedule"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamSchedule />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/results"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/submissions"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <SubmissionsListPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/submissions/:submissionId/view"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <SubmissionView />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Student Routes */}
                            <Route
                                path="/student/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/take-exam/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <TakeExam />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/profile"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/results"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentExams />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/exams/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentExamDetails />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Teacher Routes */}
                            <Route
                                path="/teacher/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <TeacherDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamsListPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/create"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamCreator />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamDetails />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/edit"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamEditor />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/schedule"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamSchedule />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/results"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/submissions"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <SubmissionsListPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/submissions/:submissionId/view"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <SubmissionView />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Student Routes */}
                            <Route
                                path="/student/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/take-exam/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <GlobalExamProtection>
                                            <TakeExam />
                                        </GlobalExamProtection>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/profile"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/results"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentExams />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/student/exams/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["student"]}>
                                        <StudentExamDetails />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Teacher Routes */}
                            <Route
                                path="/teacher/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <TeacherDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamsListPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/create"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamCreator />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamView />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/edit"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamEditor />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/schedule"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamSchedule />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/exams/:examId/results"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <ExamResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/submissions"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <SubmissionsListPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/teacher/submissions/:submissionId/view"
                                element={
                                    <ProtectedRoute allowedRoles={["teacher"]}>
                                        <SubmissionView />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Dean Routes */}
                            <Route
                                path="/dean/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <DeanDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/classes"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ClassesPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/performance"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <PerformancePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/teachers"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <TeacherPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/subjects"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <SubjectsManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/users"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <UsersManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/import-students"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ImportStudents />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/classes/:classId"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ClassView />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students/:studentId"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students/:studentId/results"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ExamManagement />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Dean Routes */}
                            <Route
                                path="/dean/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <DeanDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/classes"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["dean", "headmaster"]}
                                    >
                                        <ClassesPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/headmaster/classes"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["dean", "headmaster"]}
                                    >
                                        <ClassesPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/performance"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["dean", "headmaster"]}
                                    >
                                        <PerformancePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/headmaster/performance"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["dean", "headmaster"]}
                                    >
                                        <PerformancePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/teachers"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <TeacherPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/reports"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["dean", "headmaster"]}
                                    >
                                        <ReportingPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/headmaster/reports"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["dean", "headmaster"]}
                                    >
                                        <ReportingPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/class/:classId"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ClassView />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/class/:classId/reports"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ClassReports />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/subjects"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <SubjectsManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/users"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <UsersManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ExamManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/exams/:examId"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <DeanExamDetails />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/import-students"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ImportStudents />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/classes/:classId"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ClassView />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students/:studentId"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students/:studentId/results"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentPage />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Dean Routes */}
                            <Route
                                path="/dean/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <DeanDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/classes"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ClassesPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/performance"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <PerformancePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/teachers"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <TeacherPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/subjects"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <SubjectsManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/users"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <UsersManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/import-students"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ImportStudents />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/classes/:classId"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ClassView />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students/:studentId"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students/:studentId/results"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentResults />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/students"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <StudentPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dean/exams"
                                element={
                                    <ProtectedRoute allowedRoles={["dean"]}>
                                        <ExamManagement />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Admin Routes */}
                            <Route
                                path="/admin/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <AdminDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/users"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <UserManagement />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/settings"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SystemSettings />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/logs"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SystemLogs />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Admin Routes */}
                            <Route
                                path="/admin/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <AdminDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/schools"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SchoolManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/schools/add"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <AddSchool />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/school/:id/edit"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <AddSchool />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/school/:id"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SchoolProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/subscriptions"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SubscriptionManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/trades"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <TradesCatalog />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/trades/:id"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <TradeDetail />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/trades/add"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <AddTrades />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/subjects"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["admin", "headmaster"]}
                                    >
                                        <SubjectCatalog />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/subjects/add"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <AddSubject />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/subjects/edit/:id"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <EditSubject />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/subjects/:id"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["admin", "headmaster"]}
                                    >
                                        <SubjectDetail />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/headmasters"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <HeadmasterManagement />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/settings"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SystemSettings />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/logs"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SystemLogs />
                                    </ProtectedRoute>
                                }
                            />
                            {/* Admin Routes */}
                            <Route
                                path="/admin/dashboard"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <AdminDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/users"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <UserManagement />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/settings"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SystemSettings />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/logs"
                                element={
                                    <ProtectedRoute allowedRoles={["admin"]}>
                                        <SystemLogs />
                                    </ProtectedRoute>
                                }
                            />

                            {/* 404 Route */}
                            <Route path="*" element={<h1>Page not found</h1>} />
                        </Routes>
                    </GlobalExamProtection>
                </ToastProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
