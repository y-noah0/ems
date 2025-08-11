import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaBuilding, FaFileAlt, FaUsers, FaGraduationCap, FaChartBar, FaBars, FaClock, FaChevronDown, FaChevronRight } from "react-icons/fa";

const Sidebar = ({ userRole = "student" }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClassManagementOpen, setIsClassManagementOpen] = React.useState(
    location.pathname.includes("/dean/classes") ||
    location.pathname.includes("/dean/performance") ||
    location.pathname.includes("/headmaster/classes") ||
    location.pathname.includes("/headmaster/create-class") ||
    location.pathname.includes("/headmaster/classes/performance")
  );

  const menuItems = [
    {
      title: "Dashboard",
      icon: FaHome,
      path:
        userRole === "dean"
          ? "/dean/dashboard"
          : userRole === "teacher"
            ? "/teacher/dashboard"
            : userRole === "admin"
              ? "/admin/dashboard"
              : userRole === "headmaster"
                ? "/headmaster/dashboard"
                : "/student/dashboard",
      active:
        (userRole === "dean" && location.pathname === "/dean/dashboard") ||
        (userRole === "teacher" && location.pathname === "/teacher/dashboard") ||
        (userRole === "admin" && location.pathname === "/admin/dashboard") ||
        (userRole === "headmaster" && location.pathname === "/headmaster/dashboard") ||
        (userRole === "student" && location.pathname === "/student/dashboard"),
      roles: ["dean", "student", "teacher", "admin", "headmaster"],
    },
    {
      title: "Class Management",
      icon: FaBuilding,
      isCollapsible: true,
      active:
        location.pathname.includes("/dean/classes") ||
        location.pathname.includes("/dean/performance"),
      roles: ["dean"],
      children: [
        {
          title: "Classes",
          path: "/dean/classes",
          active: location.pathname.includes("/dean/classes"),
        },
        {
          title: "Performance",
          path: "/dean/performance",
          active: location.pathname.includes("/dean/performance"),
        },
      ],
    },
    {
      title: "Exams Management",
      icon: FaFileAlt,
      path: userRole === "teacher" ? "/teacher/exams" : "/dean/exams",
      active:
        location.pathname.includes("/teacher/exams") ||
        location.pathname.includes("/dean/exams"),
      roles: ["dean", "teacher"],
    },
    {
      title: "Teacher Management",
      icon: FaUsers,
      path: "/dean/teachers",
      active: location.pathname.includes("/dean/teachers"),
      roles: ["dean"],
    },
    // {
    //   title: "Student Management",
    //   icon: FaGraduationCap,
    //   path: "/dean/students",
    //   active: location.pathname.includes("/dean/students"),
    //   roles: ["dean"],
    // },
    // {
    //   title: "Term Summary",
    //   icon: FaFileAlt,
    //   path: "/dean/term-summary",
    //   active: location.pathname.includes("/dean/term-summary"),
    //   roles: ["dean"],
    // },
    // {
    //   title: "Courses Management",
    //   icon: FaChartBar,
    //   path: "/dean/reports",
    //   active: location.pathname.includes("/dean/reports"),
    //   roles: ["dean"],
    // },
    {
      title: "Reporting",
      icon: FaChartBar,
      path: "/dean/reports",
      active: location.pathname.includes("/dean/reports"),
      roles: ["dean"],
    },
    {
      title: "Class Management",
      icon: FaBuilding,
      isCollapsible: true,
      active:
        location.pathname.includes("/headmaster/classes") ||
        location.pathname.includes("/headmaster/create-class") ||
        location.pathname.includes("/headmaster/classes/performance"),
      roles: ["headmaster"],
      children: [
        {
          title: "Class List",
          path: "/headmaster/classes",
          active: location.pathname.includes("/headmaster/classes"),
        },
        {
          title: "Class Performance",
          path: "/headmaster/classes/performance",
          active: location.pathname.includes("/headmaster/classes/performance"),
        },
      ],
    },
    {
      title: "Trades Management",
      icon: FaBuilding,
      path: "/headmaster/trades-offered",
      active: location.pathname.includes("/headmaster/trades-offered"),
      roles: ["headmaster"],
    },
    {
      title: "Subject Catalog",
      icon: FaFileAlt,
      path: "/headmaster/subjects",
      active: location.pathname.includes("/headmaster/subjects"),
      roles: ["headmaster"],
    },
    {
      title: "User Management",
      icon: FaUsers,
      path: "/headmaster/users",
      active: location.pathname.includes("/headmaster/users"),
      roles: ["headmaster"],
    },
    {
      title: "Reporting",
      icon: FaChartBar,
      path: "/headmaster/reports",
      active: location.pathname.includes("/headmaster/reports"),
      roles: ["headmaster"],
    },
    {
      title: "Submissions",
      icon: FaFileAlt,
      path: "/teacher/submissions",
      active: location.pathname.includes("/teacher/submissions"),
      roles: ["teacher"],
    },
    {
      title: "Drafts",
      icon: FaFileAlt,
      path: "/teacher/drafts",
      active: location.pathname.includes("/teacher/drafts"),
      roles: ["teacher"],
    },
    {
      title: "School Management",
      icon: FaBuilding,
      path: "/admin/schools",
      active: location.pathname.includes("/admin/schools"),
      roles: ["admin"],
    },
    {
      title: "Headmasters Management",
      icon: FaUsers,
      path: "/admin/headmasters",
      active: location.pathname.includes("/admin/headmasters"),
      roles: ["admin"],
    },
    {
      title: "Trades Catalog",
      icon: FaBuilding,
      path: "/admin/trades",
      active: location.pathname.includes("/admin/trades"),
      roles: ["admin"],
    },
    {
      title: "Subject Catalog",
      icon: FaFileAlt,
      path: "/admin/subjects",
      active: location.pathname.includes("/admin/subjects"),
      roles: ["admin"],
    },
    {
      title: "Subscription Management",
      icon: FaFileAlt,
      path: "/admin/subscriptions",
      active: location.pathname.includes("/admin/subscriptions"),
      roles: ["admin"],
    },
    {
      title: "Exams Management",
      icon: FaFileAlt,
      path: "/headmaster/exams",
      active: location.pathname.includes("/headmaster/exams"),
      roles: ["headmaster"],
    },
    {
      title: "Exams",
      icon: FaFileAlt,
      path: "/student/exams",
      active: location.pathname.includes("/student/exams"),
      roles: ["student"],
    },
    {
      title: "Results",
      icon: FaFileAlt,
      path: "/student/results",
      active: location.pathname.includes("/student/results"),
      roles: ["student"],
    },
    {
      title: "Recent Papers",
      icon: FaClock,
      path: "/student/submissions",
      active: location.pathname.includes("/student/recent-exams") || location.pathname.includes("/student/submissions"),
      roles: ["student"],
    },
  ];

  // Filter menu items based on user role
  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => item.roles.includes(userRole));
  }, [userRole]);

  const handleMenuClick = () => {
    setIsOpen(false); // Close mobile menu
  };

  const getRoleColor = () => {
    switch (userRole) {
      case "dean":
        return "bg-green-600";
      case "teacher":
        return "bg-purple-600";
      case "admin":
        return "bg-red-600";
      case "student":
        return "bg-indigo-600";
      case "headmaster":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  const getRoleDisplayName = () => {
    switch (userRole) {
      case "dean":
        return "Dean Access";
      case "teacher":
        return "Teacher Access";
      case "admin":
        return "Admin Access";
      case "student":
        return "Student Access";
      case "headmaster":
        return "Headmaster Access";
      default:
        return "User Access";
    }
  };

  return (
    <>
      {/* Mobile sidebar toggle button */}
      <button
        className="md:hidden fixed top-12 left-4 z-50 bg-indigo-50 border border-indigo-200 rounded-lg p-2 shadow-md hover:bg-indigo-100 transition-all duration-300 focus:ring-2 focus:ring-indigo-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
      >
        <FaBars className="h-5 w-5 text-indigo-600" />
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-gradient-to-b from-indigo-50 to-white border-r border-indigo-200 transition-transform duration-300 shadow-md
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:min-h-screen md:shadow-none
        `}
      >
        {(userRole === "dean" ||
          userRole === "student" ||
          userRole === "teacher" ||
          userRole === "headmaster" ||
          userRole === "admin") && (
            <div className="p-4 sm:p-6 border-b border-indigo-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-md">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 34 34"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M14.7333 0C13.4815 0 12.4667 1.01482 12.4667 2.26667V3.4H5.66667C4.41482 3.4 3.4 4.41482 3.4 5.66667V12.4667H2.26667C1.01482 12.4667 0 13.4815 0 14.7333V19.2667C0 20.5185 1.01482 21.5333 2.26667 21.5333H3.4V28.3333C3.4 29.5852 4.41482 30.6 5.66667 30.6H12.4667V31.7333C12.4667 32.9852 13.4815 34 14.7333 34H19.2667C20.5185 34 21.5333 32.9852 21.5333 31.7333V30.6H28.3333C29.5852 30.6 30.6 29.5852 30.6 28.3333V21.5333H31.7333C32.9852 21.5333 34 20.5185 34 19.2667V14.7333C34 13.4815 32.9852 12.4667 31.7333 12.4667H30.6V5.66667C30.6 4.41482 29.5852 3.4 28.3333 3.4H21.5333V2.26667C21.5333 1.01482 20.5185 0 19.2667 0H14.7333ZM9 21.5333C10.2518 21.5333 12.5 22.7482 12.5 24C12.5 22.7482 13.4815 22 14.7333 22H19.2667C20.5185 22 21.5333 22.7482 21.5333 24C21.5333 22.7482 23.2482 21.5333 24.5 21.5333C23.2482 21.5333 22 20.5185 22 19.2667V14.7333C22 13.4815 23.2482 12.4667 24.5 12.4667C23.2482 12.4667 21.5333 11.2518 21.5333 10C21.5333 11.2518 20.5185 12 19.2667 12H14.7333C13.4815 12 12.5 11.2518 12.5 10C12.5 11.2518 10.2518 12.4667 9 12.4667C10.2518 12.4667 12 13.4815 12 14.7333V19.2667C12 20.5185 10.2518 21.5333 9 21.5333Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <span className="text-base sm:text-lg font-bold text-indigo-600">EMS Sys</span>
              </div>
            </div>
          )}

        {/* Navigation Menu */}
        <nav className="mt-4 sm:mt-6 px-2 sm:px-3">
          {visibleMenuItems.map((item, index) => (
            <div key={index} className="mb-1">
              {item.isCollapsible ? (
                <>
                  <button
                    className={`
                      w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-all duration-300
                      ${item.active ? "bg-indigo-100 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-inner" : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-[1.02]"}
                    `}
                    onClick={() => setIsClassManagementOpen(!isClassManagementOpen)}
                    aria-label={item.title}
                    aria-expanded={isClassManagementOpen}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`h-5 sm:h-6 w-5 sm:w-6 mr-3 flex-shrink-0 transition-colors duration-300 ${item.active ? "text-indigo-600" : "text-gray-500 hover:text-indigo-600"}`}
                      />
                      <span className="truncate">{item.title}</span>
                    </div>
                    {isClassManagementOpen ? (
                      <FaChevronDown className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                    ) : (
                      <FaChevronRight className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                    )}
                  </button>
                  {isClassManagementOpen && (
                    <div className="mt-1 pl-4 sm:pl-6 ml-4 sm:ml-6 space-y-1 border-l-2 border-indigo-200">
                      {item.children?.map((child, childIndex) => (
                        <Link
                          key={childIndex}
                          to={child.path}
                          className={`
                            flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-all duration-300
                            ${child.active ? "bg-indigo-100 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-inner" : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-[1.02]"}
                          `}
                          onClick={handleMenuClick}
                          aria-label={child.title}
                        >
                          <span className="truncate">{child.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`
                    flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-all duration-300
                    ${item.active ? "bg-indigo-100 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-inner" : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-[1.02]"}
                  `}
                  onClick={handleMenuClick}
                  aria-label={item.title}
                >
                  <item.icon
                    className={`h-5 sm:h-6 w-5 sm:w-6 mr-3 flex-shrink-0 transition-colors duration-300 ${item.active ? "text-indigo-600" : "text-gray-500 hover:text-indigo-600"}`}
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* User Role Indicator */}
        <div className="absolute bottom-4 left-4 sm:left-6 right-4 sm:right-6">
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getRoleColor()}`} />
              <span className="text-xs sm:text-sm font-medium text-indigo-600">{getRoleDisplayName()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;