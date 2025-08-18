import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { CalendarIcon, AcademicCapIcon, UserGroupIcon, CogIcon, ChartBarIcon, PlusIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckBadgeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import DynamicTable from '../class/DynamicTable';
import Layout from '../layout/Layout';
import enrollmentService from '../../services/enrollmentService';
import { useAuth } from '../../context/AuthContext';
import teacherServices from '../../services/teacherService';
import AddTermModel from './AddTermModel';


import termService from '../../services/termService'; 




// Integrated EmptyState Component
const EmptyState = ({ icon, title, description, actionText, onAction }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center bg-white p-8 rounded-lg border border-gray-200"
  >
    <div className="mx-auto h-12 w-12 text-gray-400">{icon}</div>
    <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
    <div className="mt-6">
      <button
        onClick={onAction}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
        {actionText}
      </button>
    </div>
  </motion.div>
);

// Integrated StatsCard Component
const StatsCard = ({ title, value, icon, trend, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800'
  };

  const trendIcons = {
    up: (
      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    ),
    down: (
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    neutral: (
      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v8a1 1 0 11-2 0V6a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    )
  };

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`p-5 rounded-lg shadow-sm border ${colors[color]} border-transparent`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 rounded-md bg-white bg-opacity-30 mr-3">
            {React.cloneElement(icon, { className: 'w-6 h-6' })}
          </div>
          <div>
            <p className="text-sm font-medium truncate">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        </div>
        {trendIcons[trend]}
      </div>
    </motion.div>
  );
};

// Integrated ProgressBar Component
const ProgressBar = ({ value, color }) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div 
        className={`h-2.5 rounded-full ${colors[color]}`}
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
};

// Integrated CalendarWidget Component
const CalendarWidget = ({ events }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July","August","September","October","November","December"];
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate.getMonth(), currentDate.getFullYear());
    const today = new Date();

    for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="h-10"></div>);

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
      const dayEvents = events.filter(event => {
        const start = event.date.split('T')[0];
        const end = event.endDate ? event.endDate.split('T')[0] : start;
        return dateStr >= start && dateStr <= end;
      });

      const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

      days.push(
        <div key={`day-${day}`} className={`h-10 border border-gray-100 flex flex-col items-center justify-start p-1 ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}>
          <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-600'}`}>{day}</span>
          {dayEvents.map(e => (
            <span key={e.id} className={`w-2 h-2 rounded-full mt-1 ${e.type === 'Inactive' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
          ))}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-200">◀</button>
        <h3 className="font-medium">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-200">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {dayNames.map(day => <div key={day} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">{day}</div>)}
        {renderDays()}
      </div>
    </div>
  );
};


const AcademicManagement = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [enrollmentData, setEnrollmentData] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser } = useAuth();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');



  useEffect(() => {
  const fetchTerms = async () => {
    if (!currentUser?.school) return;
    try {
      const data = await termService.getTerms(currentUser.school);
      setTerms(data.terms || []);
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  fetchTerms();
}, [currentUser]);

const termEvents = terms.map(term => ({
  id: term._id,
  title: `Term ${term.termNumber}`,
  date: term.startDate,       // mark the start date
  endDate: term.endDate,      // optional: could be used for multi-day events
  type: term.isDeleted ? 'Inactive' : 'Active'
}));


 // Fetch enrollments from backend
const fetchEnrollments = async (schoolId) => {
  if (!schoolId) {
    setError("School ID is required to fetch enrollments");
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  try {
    const response = await enrollmentService.getEnrollments({
      school: schoolId,
      page: pagination.page,
      limit: pagination.limit,
      search: searchQuery,
      status: statusFilter
    });

    console.log("API Response:", response);

    // controller returns { success, enrollments }
    const responseData = response?.enrollments || [];

    if (!Array.isArray(responseData)) {
      throw new Error("Invalid data format from server");
    }

    const formattedEnrollments = responseData.map((enrollment) => {
      const termValue =
        enrollment.term && typeof enrollment.term === "object"
          ? enrollment.term.name || enrollment.term.termNumber || "N/A"
          : "N/A";

      const yearValue =
        enrollment.term && typeof enrollment.term === "object"
          ? enrollment.term.academicYear
          : enrollment.academicYear || "N/A";

      return {
        id: enrollment._id,
        student: enrollment.student?.fullName || "N/A",
        studentId: enrollment.student?.registrationNumber || "N/A",
        class: enrollment.class?.level || "N/A",
        term: termValue,
        year: yearValue,
        status: enrollment.promotionStatus || "pending",
        isActive: enrollment.isActive,
        enrollmentDate: enrollment.createdAt || new Date().toISOString(),
      };
    });

    setEnrollmentData(formattedEnrollments);
    setPagination((prev) => ({
      ...prev,
      total: response.total || formattedEnrollments.length,
    }));
    setError(null);
  } catch (err) {
    console.error("Fetch enrollments error:", err);
    setError(
      err.response?.data?.message ||
        err.message ||
        "Failed to load enrollments"
    );
    setEnrollmentData([]);
  } finally {
    setIsLoading(false);
  }
  };
  
const fetchTeachers = async (schoolId) => {
  if (!schoolId) {
    setError("School ID is required to fetch teachers");
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  try {
    const response = await teacherServices.fetchTeachers(schoolId);

    console.log("API Response:", response);

    // Ensure response is an array
    const responseData = Array.isArray(response) ? response : [];

const formattedTeachers = responseData.map((teacher) => {
  let subjectsList = "N/A";

  if (Array.isArray(teacher.subjects) && teacher.subjects.length > 0) {
    // Handle both populated objects and plain strings
    subjectsList = teacher.subjects
      .map((s) => (typeof s === "string" ? s : s.name || "N/A"))
      .join(", ");
  }

  return {
    id: teacher._id,
    teacher: teacher.fullName || "N/A",
    email: teacher.email || "N/A",
    phoneNumber: teacher.phoneNumber || "N/A",
    subjects: subjectsList,
    status: teacher.isActive ? "active" : "inactive",
    school: teacher.school?.name || "N/A",
  };
});


    setTeachers(formattedTeachers);
    setPagination((prev) => ({
      ...prev,
      total: formattedTeachers.length,
    }));
    setError(null);
  } catch (err) {
    console.error("Fetch teachers error:", err);
    setError(err.response?.data?.message || err.message || "Failed to load teachers");
    setTeachers([]);
  } finally {
    setIsLoading(false);
  }
};


  useEffect(() => {
    if (currentUser?.school) {
      fetchTeachers(currentUser.school);
    }
  }, [currentUser?.school]);

  // Placeholder for handlePageChange
  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!currentUser?.school) {
          throw new Error('School information not available');
        }

        await fetchEnrollments(currentUser.school);
        await fetchMockData();
        
      } catch (err) {
        if (isMounted) {
          console.error('Initial data loading error:', err);
          setError(err.message || 'Failed to load initial data. Using cached information.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const fetchMockData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockData = {
          calendarEvents: [
            { id: 1, date: '2025-09-01', event: 'Term 1 Start', type: 'academic', importance: 'high' },
            { id: 2, date: '2025-10-15', event: 'Mid-Term Exams', type: 'exam', importance: 'critical' },
          ],
          compliance: [
            { id: 1, standard: 'National Competency Framework', compliance: '95%', issues: 2, status: 'compliant' },
            { id: 2, standard: 'Accreditation Requirements', compliance: '78%', issues: 5, status: 'partial' },
          ],
          analytics: [
            { name: 'Enrollment Rate', value: 85, target: 90, trend: 'up' },
            { name: 'Promotion Rate', value: 92, target: 95, trend: 'up' },
          ]
        };

        if (isMounted) {
          setCalendarEvents(mockData.calendarEvents);
          setComplianceData(mockData.compliance);
          setAnalyticsData(mockData.analytics);
        }
      } catch (err) {
        console.error('Error loading mock data:', err);
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, currentUser?.school]);

 const filteredEnrollments = enrollmentData.filter(item =>
  (item.student?.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
  (item.class?.level?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
  (item.student?.registrationNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase())
);


  if (isLoading) {
    return (
      <Layout>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-[calc(100vh-80px)]"
        >
          <div className="flex flex-col items-center">
            <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Loading Academic Data</h2>
            <p className="text-gray-500 mt-2">Please wait while we prepare your dashboard</p>
          </div>
        </motion.div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-6 rounded-lg bg-yellow-50 border border-yellow-200 max-w-4xl mx-auto mt-8"
        >
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500 mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-yellow-800">Data Loading Issue</h3>
              <p className="text-yellow-700 mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        </motion.div>
      </Layout>
    );
  }


  const handleAddTerm = () => {
    setShowAddTerm(true);
  };



  return (
    <Layout>
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <AcademicCapIcon className="w-10 h-10 text-indigo-600 mr-3" />
                Academic Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage enrollment, resources, and academic analytics
              </p>
            </div>
            
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search across all tabs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Overview */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8"
        >
          <StatsCard 
            title="Total Enrollments" 
            value={enrollmentData.length} 
            icon={<UserGroupIcon className="w-6 h-6" />}
            trend="up"
            color="green"
          />
          <StatsCard 
            title="Upcoming Events" 
            value={calendarEvents.length} 
            icon={<CalendarIcon className="w-6 h-6" />}
            trend="neutral"
            color="purple"
          />
          <StatsCard 
            title="Compliance Rate" 
            value={`${Math.round(complianceData.reduce((acc, curr) => acc + parseInt(curr.compliance), 0) / (complianceData.length || 1))}%`} 
            icon={<CheckBadgeIcon className="w-6 h-6" />}
            trend="down"
            color="orange"
          />
        </motion.div>

        {/* Main Tabs Section */}
        <Tabs 
          selectedIndex={tabIndex} 
          onSelect={(index) => setTabIndex(index)} 
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <TabList className="flex overflow-x-auto scrollbar-hide border-b border-gray-200">
            {[
              { icon: <CalendarIcon className="w-5 h-5 mr-2" />, label: "Calendar" },
              { icon: <UserGroupIcon className="w-5 h-5 mr-2" />, label: "Enrollment" },
              { icon: <CogIcon className="w-5 h-5 mr-2" />, label: "Resources" },
              { icon: <CheckBadgeIcon className="w-5 h-5 mr-2" />, label: "Compliance" },
              { icon: <ChartBarIcon className="w-5 h-5 mr-2" />, label: "Analytics" },
            ].map((tab, index) => (
              <Tab
                key={index}
                className={`px-5 py-3 text-sm font-medium flex items-center whitespace-nowrap cursor-pointer border-b-2 transition-colors duration-200 ${
                  tabIndex === index
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </Tab>
            ))}
          </TabList>

          <div className="p-6">
            {/* Calendar & Scheduling Tab */}
            <TabPanel>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">Academic Calendar</h2>
                  <div className="flex space-x-3">
                    <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500">
                      <option>2025-2026</option>
                      <option>2024-2025</option>
                      <option>2023-2024</option>
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Add Event
                    </motion.button>
                    <motion.button  whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                      onClick={handleAddTerm}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                      Add Term
                    </motion.button>
                  </div>
                </div>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <CalendarWidget events={termEvents} />
  </div>
  <div className="bg-white p-5 rounded-lg border border-gray-200">
    <h3 className="font-medium text-gray-800 mb-3">Upcoming Terms</h3>
    <ul className="space-y-3">
      {terms
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 5)
        .map(term => (
          <li key={term._id} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Term {term.termNumber}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Start: {new Date(term.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} 
                  – End: {new Date(term.endDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-500 mt-1">Academic Year: {term.academicYear}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                term.isDeleted ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {term.isDeleted ? 'Inactive' : 'Active'}
              </span>
            </div>
          </li>
        ))}
    </ul>
  </div>
</div>

              </motion.div>
            </TabPanel>

            {/* Enrollment & Progression Tab */}
            <TabPanel>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">Student Enrollment</h2>
                  <div className="flex space-x-3">
                    <select 
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Enroll Student
                    </motion.button>
                  </div>
                </div>

                {filteredEnrollments.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <DynamicTable
                      data={filteredEnrollments}
                      columns={[
                        { 
                          key: 'student', 
                          title: 'Student', 
                          width: '25%',
                          render: (value, row) => (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserGroupIcon className="h-6 w-6 text-gray-500" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{value}</div>
                                <div className="text-sm text-gray-500">{row.studentId}</div>
                              </div>
                            </div>
                          )
                        },
                        { key: 'class', title: 'Class', width: '15%' },
                        { key: 'term', title: 'Term', width: '10%' },
                        { key: 'year', title: 'Year', width: '10%' },
                        { 
                          key: 'status', 
                          title: 'Status', 
                          width: '15%',
                          render: (value) => (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              value === 'active' ? 'bg-green-100 text-green-800' :
                              value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {value.charAt(0).toUpperCase() + value.slice(1)}
                            </span>
                          )
                        },
                        { 
                          key: 'enrollmentDate', 
                          title: 'Enrollment Date', 
                          width: '15%',
                          render: (value) => new Date(value).toLocaleDateString()
                        },
                      ]}
                      showActions={true}
                      renderCustomActions={(item) => (
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                          <button 
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    />

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page * pagination.limit >= pagination.total}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                            <span className="font-medium">
                              {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>{' '}
                            of <span className="font-medium">{pagination.total}</span> enrollments
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                              onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                              disabled={pagination.page === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                            >
                              <ArrowPathIcon className="h-5 w-5 transform rotate-180" />
                            </button>
                            {[...Array(Math.ceil(pagination.total / pagination.limit)).keys()].map(num => (
                              <button
                                key={num}
                                onClick={() => handlePageChange(num + 1)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pagination.page === num + 1
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {num + 1}
                              </button>
                            ))}
                            <button
                              onClick={() => handlePageChange(pagination.page + 1)}
                              disabled={pagination.page * pagination.limit >= pagination.total}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<UserGroupIcon className="w-12 h-12 text-gray-400" />}
                    title="No enrollments found"
                    description="Try adjusting your search or create a new enrollment"
                    actionText="Create Enrollment"
                    onAction={() => setTabIndex(1)}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Enrollment Statistics</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Active</span>
                          <span className="text-sm font-medium">
                            {enrollmentData.length > 0 ? Math.round(enrollmentData.filter(e => e.status === 'active').length / enrollmentData.length * 100) : 0}%
                          </span>
                        </div>
                        <ProgressBar 
                          value={enrollmentData.length > 0 ? Math.round(enrollmentData.filter(e => e.status === 'active').length / enrollmentData.length * 100) : 0} 
                          color="green" 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Pending</span>
                          <span className="text-sm font-medium">
                            {enrollmentData.length > 0 ? Math.round(enrollmentData.filter(e => e.status === 'pending').length / enrollmentData.length * 100) : 0}%
                          </span>
                        </div>
                        <ProgressBar 
                          value={enrollmentData.length > 0 ? Math.round(enrollmentData.filter(e => e.status === 'pending').length / enrollmentData.length * 100) : 0} 
                          color="yellow" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Quick Enrollment</h3>
                    <div className="space-y-3">
                      <button className="w-full p-3 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 text-sm font-medium flex items-center justify-center">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Individual Enrollment
                      </button>
                      <button className="w-full p-3 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 text-sm font-medium flex items-center justify-center">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Bulk Import
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabPanel>

            {/* Resource Allocation Tab */}
            <TabPanel>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
              <div className="flex justify-between items-center">
  <h2 className="text-xl font-semibold text-gray-800">Teacher Allocation</h2>
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
  >
    <PlusIcon className="w-5 h-5 mr-2" />
    Assign Teacher
  </motion.button>
</div>

<div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
  <DynamicTable
    data={teachers} // <-- replace resourceData with teachers from API
    columns={[
      { key: 'teacher', title: 'Teacher', width: '30%' },
      { key: 'subjects', title: 'Subjects', width: '40%' },
      { 
        key: 'load', 
        title: 'Workload', 
        width: '15%',
        render: (value) => (
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
              <div 
                className={`h-2.5 rounded-full ${
                  value === '90%' ? 'bg-red-500' :
                  value === '80%' ? 'bg-orange-500' :
                  value === '65%' ? 'bg-green-500' :
                  'bg-blue-500'
                }`} 
                style={{ width: value }}
              ></div>
            </div>
            <span className="text-sm font-medium">{value}</span>
          </div>
        )
      },
      { 
        key: 'status', 
        title: 'Status', 
        width: '15%',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'overloaded' ? 'bg-red-100 text-red-800' :
            value === 'active' ? 'bg-green-100 text-green-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {value}
          </span>
        )
      },
    ]}
    showActions={true}
    renderCustomActions={(item) => (
      <div className="flex space-x-2">
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Reassign</button>
        <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">Details</button>
      </div>
    )}
  />
</div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Workload Distribution</h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Workload chart visualization</p>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Quick Allocation</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="p-3 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 text-sm font-medium">
                        Auto Assign
                      </button>
                      <button className="p-3 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 text-sm font-medium">
                        Balance Load
                      </button>
                      <button className="p-3 bg-purple-50 rounded-lg text-purple-600 hover:bg-purple-100 text-sm font-medium">
                        View Conflicts
                      </button>
                      <button className="p-3 bg-orange-50 rounded-lg text-orange-600 hover:bg-orange-100 text-sm font-medium">
                        Export Report
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabPanel>

            {/* Compliance & QA Tab */}
            <TabPanel>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">Compliance Status</h2>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <ArrowPathIcon className="w-5 h-5 mr-2" />
                    Run Audit
                  </motion.button>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <DynamicTable
                    data={complianceData}
                    columns={[
                      { key: 'standard', title: 'Standard', width: '40%' },
                      { 
                        key: 'compliance', 
                        title: 'Compliance', 
                        width: '20%',
                        render: (value) => (
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  parseInt(value) >= 90 ? 'bg-green-500' :
                                  parseInt(value) >= 70 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`} 
                                style={{ width: value }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        )
                      },
                      { key: 'issues', title: 'Issues', width: '15%' },
                      { 
                        key: 'status', 
                        title: 'Status', 
                        width: '25%',
                        render: (value) => (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            value === 'compliant' ? 'bg-green-100 text-green-800' :
                            value === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {value === 'compliant' ? 'Fully Compliant' :
                             value === 'partial' ? 'Partially Compliant' :
                             'Non-Compliant'}
                          </span>
                        )
                      },
                    ]}
                    showActions={true}
                    renderCustomActions={(item) => (
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Details</button>
                        <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">Report</button>
                      </div>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Compliance Overview</h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Compliance dashboard visualization</p>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="p-3 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 text-sm font-medium">
                        View Gaps
                      </button>
                      <button className="p-3 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 text-sm font-medium">
                        Create Plan
                      </button>
                      <button className="p-3 bg-purple-50 rounded-lg text-purple-600 hover:bg-purple-100 text-sm font-medium">
                        Export Report
                      </button>
                      <button className="p-3 bg-orange-50 rounded-lg text-orange-600 hover:bg-blue-100 text-sm font-medium">
                        Request Review
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabPanel>

            {/* Analytics & Insights Tab */}
            <TabPanel>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">Academic Analytics</h2>
                  <div className="flex space-x-3">
                    <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500">
                      <option>Current Term</option>
                      <option>Last Term</option>
                      <option>Academic Year</option>
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      <ArrowPathIcon className="w-5 h-5 mr-2" />
                      Refresh Data
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analyticsData.map((metric, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-5 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-gray-800">{metric.name}</h3>
                          <p className="text-sm text-gray-500">Target: {metric.target}%</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          metric.trend === 'up' ? 'bg-green-100 text-green-800' :
                          metric.trend === 'down' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {metric.trend === 'up' ? 'Improving' :
                           metric.trend === 'down' ? 'Declining' :
                           'Stable'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-2xl font-bold">{metric.value}%</span>
                        <span className={`text-sm font-medium ${
                          metric.value >= metric.target ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metric.value >= metric.target ? '+' : ''}
                          {metric.value - metric.target}%
                          {metric.value >= metric.target ? ' above' : ' below'} target
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            metric.value >= metric.target ? 'bg-green-500' :
                            metric.value >= metric.target - 10 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Performance Trends</h3>
                    <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Performance trend chart visualization</p>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Quick Reports</h3>
                    <div className="space-y-3">
                      <button className="w-full p-3 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 text-sm font-medium flex items-center justify-between">
                        Enrollment Report
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                      <button className="w-full p-3 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 text-sm font-medium flex items-center justify-between">
                        Academic Performance
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                      <button className="w-full p-3 bg-purple-50 rounded-lg text-purple-600 hover:bg-blue-100 text-sm font-medium flex items-center justify-between">
                        Teacher Workload
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                      <button className="w-full p-3 bg-orange-50 rounded-lg text-orange-600 hover:bg-blue-100 text-sm font-medium flex items-center justify-between">
                        Compliance Summary
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabPanel>
          </div>
        </Tabs>
       {showAddTerm && (
          <AddTermModel  onClose={() => setShowAddTerm(false)}/>
        )}
      </div>
    </Layout>
  );
};
export default AcademicManagement;