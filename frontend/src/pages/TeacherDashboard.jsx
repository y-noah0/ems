import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import {
  FaBook,
  FaPlus,
  FaCalendar,
  FaPlayCircle,
  FaCheckCircle,
  FaFileAlt,
  FaSpinner,
  FaSearch,
  FaArrowRight,
  FaChevronDown,
} from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PerformanceChart from '../components/ui/perfomanceChart';
import examService from '../services/examService';

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionVisibility, setSectionVisibility] = useState({
    draft: false,
    scheduled: false,
    active: false,
    completed: false,
  });

  useEffect(() => {
    const fetchExams = async () => {
      if (!currentUser?.school) {
        toast.error('No school associated with your account. Please log in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const examsData = await examService.getTeacherExams(currentUser.school);
        setExams(Array.isArray(examsData) ? examsData : []);
      } catch (error) {
        console.error('Error fetching exams:', error);
        toast.error(error.message || 'Failed to load exams');
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [currentUser]);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        searchTerm === '' ||
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exam.subject?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [exams, searchTerm]);

  const groupedExams = useMemo(
    () => ({
      draft: filteredExams.filter((exam) => exam.status === 'draft'),
      scheduled: filteredExams.filter((exam) => exam.status === 'scheduled'),
      active: filteredExams.filter((exam) => exam.status === 'active'),
      completed: filteredExams.filter((exam) => exam.status === 'completed'),
    }),
    [filteredExams]
  );

  const toggleSection = (section) => {
    setSectionVisibility((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <FaBook className="h-6 sm:h-8 w-6 sm:w-8 text-indigo-600" aria-hidden="true" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600">
                Welcome back, {currentUser?.fullName || 'Teacher'}
              </p>
            </div>
          </div>
          <Button
            as={Link}
            to="/teacher/exams/create"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 sm:px-6 py-2 shadow-md focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
            aria-label="Create new exam"
          >
            <FaPlus className="h-4 w-4" />
            Create New Exam
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6 mt-8">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams..."
            className="pl-10 pr-4 py-2 w-full sm:max-w-md bg-gray-50 border border-indigo-300 rounded-full text-sm sm:text-base text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search exams"
          />
        </div>

        {/* Performance Chart */}
        <PerformanceChart />
        <br />

        {/* Loading and No Data States */}
        {loading ? (
          <div className="flex justify-center items-center py-12 sm:py-16 min-h-[40vh]">
            <FaSpinner className="h-10 sm:h-12 w-10 sm:w-12 text-indigo-600 animate-spin" aria-hidden="true" />
          </div>
        ) : filteredExams.length === 0 ? (
          <Card className="bg-gray-50 border-indigo-200 w-full max-w-3xl mx-auto">
            <div className="p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl mb-4">📚</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">No Exams Found</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                {searchTerm ? 'Try adjusting your search.' : 'Start by creating your first exam!'}
              </p>
              <Button
                as={Link}
                to="/teacher/exams/create"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 sm:px-6 py-2 shadow-md focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto mx-auto"
                aria-label="Create new exam"
              >
                <FaPlus className="h-4 w-4" />
                Create New Exam
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {[
              { key: 'draft', title: 'Draft Exams', icon: FaFileAlt, status: 'draft' },
              { key: 'scheduled', title: 'Scheduled Exams', icon: FaCalendar, status: 'scheduled' },
              { key: 'active', title: 'Active Exams', icon: FaPlayCircle, status: 'active' },
              { key: 'completed', title: 'Completed Exams', icon: FaCheckCircle, status: 'completed' },
            ].map(({ key, title, icon: Icon, status }) => (
              <Card key={key} className="bg-gray-50 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 w-full">
                <div className="p-4 sm:p-6">
                  <button
                    className="flex justify-between items-center w-full text-left"
                    onClick={() => toggleSection(key)}
                    aria-expanded={sectionVisibility[key]}
                    aria-controls={`${key}-exams`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 sm:h-6 w-5 sm:w-6 text-indigo-600" />
                      <h2 className="text-base sm:text-lg font-semibold text-indigo-600">
                        {title} <span className="sm:inline hidden">({groupedExams[key].length})</span>
                      </h2>
                    </div>
                    <FaChevronDown
                      className={`h-4 sm:h-5 w-4 sm:w-5 text-indigo-600 transition-transform ${sectionVisibility[key] ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {sectionVisibility[key] && (
                    <>
                      <ul
                        id={`${key}-exams`}
                        className="mt-3 sm:mt-4 space-y-2 max-h-72 overflow-auto"
                        aria-label={`${title} list`}
                      >
                        {groupedExams[key].length === 0 ? (
                          <li className="text-gray-600 text-sm sm:text-base">No {status} exams available</li>
                        ) : (
                          groupedExams[key].map((exam) => (
                            <li
                              key={exam._id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-gray-200 rounded-md shadow-sm hover:shadow-md cursor-pointer transition-shadow duration-200"
                              onClick={() => navigate(`/teacher/exams/${exam._id}`)}
                              tabIndex={0}
                              role="button"
                              aria-pressed="false"
                            >
                              <div className="flex-grow min-w-0">
                                <p className="text-indigo-700 font-semibold truncate">{exam.title}</p>
                                <p className="text-gray-500 text-sm truncate">
                                  Classes:{' '}
                                  {Array.isArray(exam.classes) && exam.classes.length > 0
                                    ? exam.classes.map((cls) => cls.className || `${cls.level}${cls.trade?.code || ''}`).join(', ')
                                    : 'No class assigned'}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  Schedule:{' '}
                                  {exam.schedule?.start
                                    ? new Date(exam.schedule.start).toLocaleString('en-US', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })
                                    : 'Not scheduled'}{' '}
                                  -{' '}
                                  {exam.schedule?.start && exam.schedule?.duration
                                    ? new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000).toLocaleString('en-US', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })
                                    : ''}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status === 'draft'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : status === 'scheduled'
                                      ? 'bg-blue-100 text-blue-800'
                                      : status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                  }`}
                              >
                                {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>

                      <div className="mt-3 flex justify-end">
                        <Button
                          as={Link}
                          to={`/teacher/exams?status=${status}`}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-3 sm:px-4 py-1 text-xs sm:text-sm shadow-md focus:ring-2 focus:ring-indigo-500"
                          aria-label={`View details for ${status} exams`}
                        >
                          View Details
                          <FaArrowRight className="h-3 sm:h-4 w-3 sm:w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TeacherDashboard;
