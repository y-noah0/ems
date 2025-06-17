// components/navigation/Sidebar.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Students', path: '/students' },
    { name: 'Classes', path: '/classes' },
    { name: 'Exams', path: '/exams' },
    { name: 'Reports', path: '/reports' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <div className={`h-screen bg-blue-800 text-white flex flex-col ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
      <div className="p-4 flex items-center justify-center h-16">
        {collapsed ? (
          <span className="text-xl font-bold">E</span>
        ) : (
          <h1 className="text-xl font-bold">EMS sys</h1>
        )}
      </div>
      
      <nav className="flex-1 mt-6 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded-lg transition-colors ${
                  location.pathname === item.path 
                    ? 'bg-blue-700' 
                    : 'hover:bg-blue-700'
                }`}
                title={collapsed ? item.name : undefined}
              >
                {/* Removed icon */}
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-blue-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-blue-700 transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <span className="h-5 w-5">→</span> // Right arrow text
          ) : (
            <>
              <span className="h-5 w-5">←</span> // Left arrow text
              <span className="ml-2">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;