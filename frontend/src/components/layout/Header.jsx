import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                School Exam System
              </Link>
            </div>
            {isAuthenticated && (
              <nav className="ml-6 flex space-x-4 items-center">
                {currentUser?.role === 'student' && (
                  <>
                    <Link to="/student/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Dashboard
                    </Link>
                    <Link to="/student/exams" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Exams
                    </Link>
                    <Link to="/student/results" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Results
                    </Link>
                  </>
                )}

                {currentUser?.role === 'teacher' && (
                  <>
                    <Link to="/teacher/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Dashboard
                    </Link>
                    <Link to="/teacher/exams" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Exams
                    </Link>
                    <Link to="/teacher/submissions" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Submissions
                    </Link>
                  </>
                )}

                {currentUser?.role === 'dean' && (
                  <>
                    <Link to="/dean/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Dashboard
                    </Link>
                    <Link to="/dean/classes" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Classes
                    </Link>
                    <Link to="/dean/subjects" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Subjects
                    </Link>
                    <Link to="/dean/users" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Users
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="ml-3 relative flex items-center">
                <span className="mr-4 text-sm font-medium text-gray-700">
                  {currentUser?.fullName} ({currentUser?.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div>
                <Link
                  to="/login"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
