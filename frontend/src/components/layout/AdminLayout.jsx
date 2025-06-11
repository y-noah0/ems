import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Check if the current path is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="flex justify-center items-center py-5">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gray-800 text-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between py-4">
            {/* Logo */}
            <Link to="/admin/dashboard" className="text-xl font-bold">
              School Exam System - Admin
            </Link>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                type="button"
                className="text-gray-200 hover:text-white focus:outline-none"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path
                      fillRule="evenodd"
                      d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.829 4.828 4.828z"
                    />
                  ) : (
                    <path
                      fillRule="evenodd"
                      d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"
                    />
                  )}
                </svg>
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              <Link
                to="/admin/dashboard"
                className={`py-2 px-1 ${
                  isActive('/admin/dashboard')
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-200 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/users"
                className={`py-2 px-1 ${
                  isActive('/admin/users')
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-200 hover:text-white'
                }`}
              >
                User Management
              </Link>
              <Link
                to="/admin/settings"
                className={`py-2 px-1 ${
                  isActive('/admin/settings')
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-200 hover:text-white'
                }`}
              >
                System Settings
              </Link>
              <Link
                to="/admin/logs"
                className={`py-2 px-1 ${
                  isActive('/admin/logs')
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-200 hover:text-white'
                }`}
              >
                System Logs
              </Link>

              <div className="flex items-center ml-6 space-x-4">
                <span className="text-gray-300">{currentUser.fullName} (Admin)</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-2">
              <Link
                to="/admin/dashboard"
                className={`block px-4 py-2 ${
                  isActive('/admin/dashboard') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/users"
                className={`block px-4 py-2 ${
                  isActive('/admin/users') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                User Management
              </Link>
              <Link
                to="/admin/settings"
                className={`block px-4 py-2 ${
                  isActive('/admin/settings') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                System Settings
              </Link>
              <Link
                to="/admin/logs"
                className={`block px-4 py-2 ${
                  isActive('/admin/logs') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                System Logs
              </Link>
              <div className="mt-2 px-4 py-2 border-t border-gray-700">
                <span className="block text-gray-300 mb-2">{currentUser.fullName} (Admin)</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-300">© 2025 School Exam System - Administrator Panel</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
