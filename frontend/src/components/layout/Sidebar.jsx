import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Users, 
  GraduationCap, 
  BarChart3, 
  FileBarChart,
  Menu
} from 'lucide-react';

const Sidebar = ({ userRole = 'student' }) => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: userRole === 'dean' ? '/dean/dashboard' : 
            userRole === 'teacher' ? '/teacher/dashboard' :
            userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard',
      active: (userRole === 'dean' && location.pathname === '/dean/dashboard') ||
              (userRole === 'teacher' && location.pathname === '/teacher/dashboard') ||
              (userRole === 'admin' && location.pathname === '/admin/dashboard') ||
              (userRole === 'student' && location.pathname === '/student/dashboard'),
      roles: ['dean', 'student', 'teacher', 'admin']
    },
    {
      title: 'Class management',
      icon: Building2,
      path: '/dean/classes',
      active: location.pathname.includes('/dean/classes'),
      roles: ['dean']
    },
    // {
    //   title: 'Class performance',
    //   icon: Building2,
    //   path: '/dean/performance',
    //   active: location.pathname.includes('/dean/performance'),
    //   roles: ['dean']
    // },
    {
      title: 'Exams Management',
      icon: FileText,
      path: userRole === 'teacher' ? '/teacher/exams' : '/dean/exams',
      active: location.pathname.includes('/teacher/exams') || location.pathname.includes('/dean/exams'),
      roles: ['dean', 'teacher']
    },
    {
      title: 'Teacher management',
      icon: Users,
      path: '/dean/teachers',
      active: location.pathname.includes('/dean/teachers'),
      roles: ['dean']
    },
    // {
    //   title: 'Student Management',
    //   icon: GraduationCap,
    //   path: '/dean/students',
    //   active: location.pathname.includes('/dean/students'),
    //   roles: ['dean']
    // },
    {
      title: 'Reporting',
      icon: BarChart3,
      path: '/dean/reports',
      active: location.pathname.includes('/dean/reports'),
      roles: ['dean']
    },
    {
      title: 'Term summary',
      icon: FileBarChart,
      path: '/dean/term-summary',
      active: location.pathname.includes('/dean/term-summary'),
      roles: ['dean']
    },
    // Teacher specific items
    {
      title: 'Submissions',
      icon: FileText,
      path: '/teacher/submissions',
      active: location.pathname.includes('/teacher/submissions'),
      roles: ['teacher']
    },
    // Admin specific items
    {
      title: 'User Management',
      icon: Users,
      path: '/admin/users',
      active: location.pathname.includes('/admin/users'),
      roles: ['admin']
    },
    {
      title: 'System Settings',
      icon: Building2,
      path: '/admin/settings',
      active: location.pathname.includes('/admin/settings'),
      roles: ['admin']
    },
    {
      title: 'System Logs',
      icon: FileBarChart,
      path: '/admin/logs',
      active: location.pathname.includes('/admin/logs'),
      roles: ['admin']
    }
  ];

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  // Check if dashboard button should be disabled for current user
  const isDashboardDisabled = (item) => {
    return item.title === 'Dashboard' && item.active;
  };

  const [isOpen, setIsOpen] = React.useState(false);

  const handleMenuClick = (item) => {
    if (isDashboardDisabled(item)) {
      return; // Don't navigate if dashboard is disabled
    }
    setIsOpen(false); // Close mobile menu
  };

  const getRoleColor = () => {
    switch(userRole) {
      case 'dean': return 'bg-green-500';
      case 'teacher': return 'bg-purple-500';
      case 'admin': return 'bg-red-500';
      case 'student': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleDisplayName = () => {
    switch(userRole) {
      case 'dean': return 'Dean Access';
      case 'teacher': return 'Teacher Access';
      case 'admin': return 'Admin Access';
      case 'student': return 'Student Access';
      default: return 'User Access';
    }
  };

  return (
    <>
      {/* Mobile sidebar toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-gray-200 rounded-lg p-2 shadow-lg transition-all duration-200 hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-200 transition-transform duration-300 shadow-lg
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:block md:min-h-screen md:shadow-none
        `}
      >
        {/* Logo and Title - Only show for dean, teacher, and admin */}
        {(userRole === 'dean' || userRole === 'teacher' || userRole === 'admin') && (
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 34 34" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M14.7333 0C13.4815 0 12.4667 1.01482 12.4667 2.26667V3.4H5.66667C4.41482 3.4 3.4 4.41482 3.4 5.66667V12.4667H2.26667C1.01482 12.4667 0 13.4815 0 14.7333V19.2667C0 20.5185 1.01482 21.5333 2.26667 21.5333H3.4V28.3333C3.4 29.5852 4.41482 30.6 5.66667 30.6H12.4667V31.7333C12.4667 32.9852 13.4815 34 14.7333 34H19.2667C20.5185 34 21.5333 32.9852 21.5333 31.7333V30.6H28.3333C29.5852 30.6 30.6 29.5852 30.6 28.3333V21.5333H31.7333C32.9852 21.5333 34 20.5185 34 19.2667V14.7333C34 13.4815 32.9852 12.4667 31.7333 12.4667H30.6V5.66667C30.6 4.41482 29.5852 3.4 28.3333 3.4H21.5333V2.26667C21.5333 1.01482 20.5185 0 19.2667 0H14.7333ZM9 21.5333C10.2518 21.5333 12.5 22.7482 12.5 24C12.5 22.7482 13.4815 22 14.7333 22H19.2667C20.5185 22 21.5333 22.7482 21.5333 24C21.5333 22.7482 23.2482 21.5333 24.5 21.5333C23.2482 21.5333 22 20.5185 22 19.2667V14.7333C22 13.4815 23.2482 12.4667 24.5 12.4667C23.2482 12.4667 21.5333 11.2518 21.5333 10C21.5333 11.2518 20.5185 12 19.2667 12H14.7333C13.4815 12 12.5 11.2518 12.5 10C12.5 11.2518 10.2518 12.4667 9 12.4667C10.2518 12.4667 12 13.4815 12 14.7333V19.2667C12 20.5185 10.2518 21.5333 9 21.5333Z" fill="white"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">EMS sys</span>
            </div>
          </div>
        )}
        
        {/* Navigation Menu */}
        <nav className={`${(userRole === 'dean' || userRole === 'teacher' || userRole === 'admin') ? 'mt-2' : 'mt-8'} pb-4`}>
          {visibleMenuItems.map((item, index) => {
            const isDisabled = isDashboardDisabled(item);
            
            return (
              <div key={index}>
                {isDisabled ? (
                  <div
                    className={`flex items-center px-6 py-3 text-sm font-medium cursor-not-allowed
                      bg-blue-50 text-blue-700 border-r-4 border-blue-600 opacity-75`}
                  >
                    <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{item.title}</span>
                    <span className="ml-auto text-xs text-blue-500">Current</span>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center px-6 py-3 text-sm font-medium transition-all duration-200 group
                      ${item.active
                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-r-4 border-transparent hover:border-gray-200'
                      }`}
                    onClick={() => handleMenuClick(item)}
                  >
                    <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-colors duration-200 
                      ${item.active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className="truncate">{item.title}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Role Indicator */}
        <div className="absolute bottom-4 left-6 right-6">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getRoleColor()}`} />
              <span className="text-xs font-medium text-gray-600">{getRoleDisplayName()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;