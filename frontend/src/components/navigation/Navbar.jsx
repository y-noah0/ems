// components/navigation/Navbar.js
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onMenuToggle }) => {
  const { currentUser, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="p-1 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
          >
            <span className="text-lg">☰</span> {/* Hamburger menu symbol */}
          </button>
          
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span> {/* Search symbol */}
            </div>
            <input
              type="text"
              placeholder="Search students, classes..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-1 rounded-full text-gray-500 hover:text-gray-600 hover:bg-gray-100 relative">
            <span className="text-lg">🔔</span> {/* Bell symbol */}
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          </button>
          
          <div className="relative">
            <button 
              className="flex items-center space-x-2 focus:outline-none"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600">👤</span> {/* User symbol */}
              </div>
              {currentUser && (
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">{currentUser.fullName}</p>
                  <p className="text-xs text-gray-500">Dean</p>
                </div>
              )}
              <span className={`h-4 w-4 text-gray-500 ${showDropdown ? 'transform rotate-180' : ''}`}>
                ▼ {/* Down arrow */}
              </span>
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Your Profile</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;