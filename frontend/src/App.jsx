import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import useFullscreen from './hooks/useFullscreen';

// Pages imports
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TakeExam from './pages/TakeExam';
import DeanDashboard from './components/dashboard/DeanDashboard';
import ClassesManagement from './pages/ClassesManagement';
import ClassView from './pages/ClassView';
import SubjectsManagement from './pages/SubjectsManagement';
import UsersManagement from './pages/UsersManagement';
import ImportStudents from './pages/ImportStudents';
import StudentManagement from './pages/StudentManagement';
import StudentProfile from './pages/StudentProfile';
import StudentResults from './pages/StudentResults';

// Teacher Pages
import TeacherDashboard from './pages/TeacherDashboard';
import ExamCreator from './pages/ExamCreator';
import ExamEditor from './pages/ExamEditor';
import ExamResults from './pages/ExamResults';
import ExamView from './pages/ExamView';
import ExamSchedule from './pages/ExamSchedule';
import ExamsListPage from './pages/ExamsListPage';
import SubmissionsListPage from './pages/SubmissionsListPage';
import SubmissionView from './pages/SubmissionView';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import SystemLogs from './pages/admin/SystemLogs';
import StudentExams from './pages/StudentExams';
import StudentExamDetails from './pages/StudentExamDetails';
import ExamManagement from './pages/Dean/ExamManagement';
import ExamDetails from './pages/Dean/ExamDetails';

// Role-Based Redirect Component
const RoleBasedRedirect = () => {
  const { currentUser } = useAuth();

  if (currentUser?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  } else if (currentUser?.role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  } else if (currentUser?.role === 'dean') {
    return <Navigate to="/dean/dashboard" replace />;
  } else if (currentUser?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
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

// Global Exam Protection Wrapper (now applies to ALL routes)
const GlobalExamProtection = ({ children }) => {
  // eslint-disable-next-line no-unused-vars
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
        <GlobalExamProtection>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Redirect root to appropriate dashboard based on role */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/take-exam/:examId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <TakeExam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/results"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exams"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentExams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exams/:examId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentExamDetails />
                </ProtectedRoute>
              }
            />

            {/* Teacher Routes */}
            <Route
              path="/teacher/dashboard"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <ExamsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/create"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <ExamCreator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/:examId"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <ExamView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/:examId/edit"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <ExamEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/:examId/schedule"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <ExamSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/:examId/results"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <ExamResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/submissions"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <SubmissionsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/submissions/:submissionId/view"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <SubmissionView />
                </ProtectedRoute>
              }
            />

            {/* Dean Routes */}
            <Route
              path="/dean/dashboard"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <DeanDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/classes"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <ClassesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/subjects"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <SubjectsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/users"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <UsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/exams"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <ExamManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/exams/:id"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <ExamDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/import-students"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <ImportStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/classes/:classId"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <ClassView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/students/:studentId"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/students/:studentId/results"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <StudentResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dean/students"
              element={
                <ProtectedRoute allowedRoles={['dean']}>
                  <StudentManagement />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SystemSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SystemLogs />
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<div>Page not found</div>} />
          </Routes>
        </GlobalExamProtection>
      </AuthProvider>
    </Router>
  );
}

export default App;
