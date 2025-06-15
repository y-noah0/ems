import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Users, 
  GraduationCap, 
  BarChart3, 
  FileBarChart 
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dean/dashboard',
      active: location.pathname === '/dean/dashboard'
    },
    {
      title: 'Class management',
      icon: Building2,
      path: '/dean/classes',
      active: location.pathname.includes('/dean/classes')
    },
    {
      title: 'Exams Management',
      icon: FileText,
      path: '/dean/exams',
      active: location.pathname.includes('/dean/exams')
    },
    {
      title: 'Teacher management',
      icon: Users,
      path: '/dean/teachers',
      active: location.pathname.includes('/dean/teachers')
    },
    {
      title: 'Student Management',
      icon: GraduationCap,
      path: '/dean/students',
      active: location.pathname.includes('/dean/students')
    },
    {
      title: 'Reporting',
      icon: BarChart3,
      path: '/dean/reports',
      active: location.pathname.includes('/dean/reports')
    },
    {
      title: 'Term summary',
      icon: FileBarChart,
      path: '/dean/term-summary',
      active: location.pathname.includes('/dean/term-summary')
    }
  ];

  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      {/* Mobile sidebar toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border rounded-md p-2 shadow"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-200 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:block md:min-h-screen
        `}
      >
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M14.7333 0C13.4815 0 12.4667 1.01482 12.4667 2.26667V3.4H5.66667C4.41482 3.4 3.4 4.41482 3.4 5.66667V12.4667H2.26667C1.01482 12.4667 0 13.4815 0 14.7333V19.2667C0 20.5185 1.01482 21.5333 2.26667 21.5333H3.4V28.3333C3.4 29.5852 4.41482 30.6 5.66667 30.6H12.4667V31.7333C12.4667 32.9852 13.4815 34 14.7333 34H19.2667C20.5185 34 21.5333 32.9852 21.5333 31.7333V30.6H28.3333C29.5852 30.6 30.6 29.5852 30.6 28.3333V21.5333H31.7333C32.9852 21.5333 34 20.5185 34 19.2667V14.7333C34 13.4815 32.9852 12.4667 31.7333 12.4667H30.6V5.66667C30.6 4.41482 29.5852 3.4 28.3333 3.4H21.5333V2.26667C21.5333 1.01482 20.5185 0 19.2667 0H14.7333ZM9 21.5333C10.2518 21.5333 12.5 22.7482 12.5 24C12.5 22.7482 13.4815 22 14.7333 22H19.2667C20.5185 22 21.5333 22.7482 21.5333 24C21.5333 22.7482 23.2482 21.5333 24.5 21.5333C23.2482 21.5333 22 20.5185 22 19.2667V14.7333C22 13.4815 23.2482 12.4667 24.5 12.4667C23.2482 12.4667 21.5333 11.2518 21.5333 10C21.5333 11.2518 20.5185 12 19.2667 12H14.7333C13.4815 12 12.5 11.2518 12.5 10C12.5 11.2518 10.2518 12.4667 9 12.4667C10.2518 12.4667 12 13.4815 12 14.7333V19.2667C12 20.5185 10.2518 21.5333 9 21.5333Z" fill="#3F6EEC"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-800">EMS sys</span>
          </div>
        </div>
        
        <nav className="mt-8">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                item.active
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;