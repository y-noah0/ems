import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FaBook, FaPlus, FaCalendar, FaPlayCircle, FaCheckCircle, FaEye, FaTrash, FaFileAlt, FaSpinner, FaSearch, FaArrowRight, FaChevronDown, FaEdit } from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ExamCard from '../components/ui/ExamCard';
import examService from '../services/examService';

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionVisibility, setSectionVisibility] = useState({
    draft: true,
    scheduled: true,
    active: true,
    completed: true,
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

  const handleActivateExam = async (examId) => {
    if (!currentUser?.school) {
      toast.error('No school associated with your account.');
      return;
    }

    setLoading(true);
    try {
      const updatedExam = await examService.activateExam(examId, currentUser.school);
      setExams(exams.map((exam) => (exam._id === examId ? updatedExam : exam)));
      toast.success('Exam activated successfully!');
    } catch (error) {
      console.error('Error activating exam:', error);
      toast.error(error.message || 'Failed to activate exam');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteExam = async (examId) => {
    if (!currentUser?.school) {
      toast.error('No school associated with your account.');
      return;
    }

    setLoading(true);
    try {
      const updatedExam = await examService.completeExam(examId, currentUser.school);
      setExams(exams.map((exam) => (exam._id === examId ? updatedExam : exam)));
      toast.success('Exam completed successfully!');
    } catch (error) {
      console.error('Error completing exam:', error);
      toast.error(error.message || 'Failed to complete exam');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleExam = async (examId, scheduleData) => {
    if (!currentUser?.school) {
      toast.error('No school associated with your account.');
      return;
    }

    setLoading(true);
    try {
      const updatedExam = await examService.scheduleExam(examId, scheduleData, currentUser.school);
      setExams(exams.map((exam) => (exam._id === examId ? updatedExam : exam)));
      toast.success('Exam scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling exam:', error);
      toast.error(error.message || 'Failed to schedule exam');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!currentUser?.school) {
      toast.error('No school associated with your account.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this exam?')) {
      return;
    }

    setLoading(true);
    try {
      await examService.deleteExam(examId, currentUser.school);
      setExams(exams.filter((exam) => exam._id !== examId));
      toast.success('Exam deleted successfully!');
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error(error.message || 'Failed to delete exam');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPoints = (questions) => {
    return questions?.reduce((sum, q) => sum + (parseInt(q.maxScore) || 0), 0) || 0;
  };

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        searchTerm === '' ||
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exam.subject?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [exams, searchTerm]);

  const groupedExams = useMemo(() => ({
    draft: filteredExams.filter((exam) => exam.status === 'draft'),
    scheduled: filteredExams.filter((exam) => exam.status === 'scheduled'),
    active: filteredExams.filter((exam) => exam.status === 'active'),
    completed: filteredExams.filter((exam) => exam.status === 'completed'),
  }), [filteredExams]);

  const toggleSection = (section) => {
    setSectionVisibility((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto">
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

        <div className="relative mb-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { key: 'draft', title: 'Draft Exams', icon: FaFileAlt, status: 'draft', color: 'bg-yellow-100 text-yellow-800' },
              { key: 'scheduled', title: 'Scheduled Exams', icon: FaCalendar, status: 'scheduled', color: 'bg-blue-100 text-blue-800' },
              { key: 'active', title: 'Active Exams', icon: FaPlayCircle, status: 'active', color: 'bg-green-100 text-green-800' },
              { key: 'completed', title: 'Completed Exams', icon: FaCheckCircle, status: 'completed', color: 'bg-gray-100 text-gray-800' },
            ].map(({ key, title, icon: Icon, status, color }) => (
              <Card
                key={key}
                className="bg-gray-50 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 w-full"
              >
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
                    <div id={`${key}-exams`} className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-sm font-medium ${color}`}
                        >
                          {groupedExams[key].length} {groupedExams[key].length === 1 ? 'exam' : 'exams'}
                        </span>
                        <Button
                          as={Link}
                          to={`/teacher/exams?status=${status}`}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-3 sm:px-4 py-1 text-xs sm:text-sm shadow-md focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                          aria-label={`View details for ${status} exams`}
                        >
                          View Details
                          <FaArrowRight className="h-3 sm:h-4 w-3 sm:w-4" />
                        </Button>
                      </div>
                      {groupedExams[key].length === 0 ? (
                        <p className="text-gray-600 text-sm sm:text-base">No {status} exams available</p>
                      ) : (
                        groupedExams[key]
                          .slice(0, key === 'completed' ? 5 : undefined)
                          .map((exam) => (
                            <ExamCard
                              key={exam._id}
                              examId={exam._id}
                              title={exam.title}
                              subject={exam.subject?.name || 'Unknown Subject'}
                              classCode={
                                Array.isArray(exam.classes) && exam.classes.length > 0
                                  ? exam.classes
                                    .map((cls) => cls.className || `${cls.level}${cls.trade?.code || ''}`)
                                    .join(', ')
                                  : 'No class assigned'
                              }
                              description={
                                exam.instructions ||
                                `${exam.type.charAt(0).toUpperCase() + exam.type.slice(1)} - ${exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}`
                              }
                              status={exam.status}
                              statusBadge={
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-sm font-medium ${color}`}
                                >
                                  {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                                </span>
                              }
                              startTime={
                                exam.schedule?.start
                                  ? new Date(exam.schedule.start).toLocaleString('en-US', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                  : 'Not scheduled'
                              }
                              endTime={
                                exam.schedule?.start && exam.schedule?.duration
                                  ? new Date(
                                    new Date(exam.schedule.start).getTime() +
                                    exam.schedule.duration * 60000
                                  ).toLocaleString('en-US', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                  : 'Not scheduled'
                              }
                              questions={exam.questions?.length || 0}
                              totalPoints={calculateTotalPoints(exam.questions)}
                              userRole="teacher"
                              actions={[
                                ...(exam.status === 'draft'
                                  ? [
                                    {
                                      label: 'Schedule',
                                      onClick: () => {
                                        const startTime = prompt('Enter start time (YYYY-MM-DDTHH:MM):');
                                        const duration = prompt('Enter duration (minutes):');
                                        if (startTime && duration) {
                                          const scheduleData = {
                                            start: new Date(startTime).toISOString(),
                                            duration: parseInt(duration),
                                          };
                                          if (new Date(scheduleData.start) <= new Date()) {
                                            toast.error('Start time must be in the future');
                                            return;
                                          }
                                          if (scheduleData.duration < 5) {
                                            toast.error('Duration must be at least 5 minutes');
                                            return;
                                          }
                                          handleScheduleExam(exam._id, scheduleData);
                                        }
                                      },
                                      icon: <FaCalendar className="h-3 sm:h-4 w-3 sm:w-4" />,
                                      className: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1',
                                    },
                                    {
                                      label: 'Edit',
                                      onClick: () => navigate(`/teacher/exams/${exam._id}/edit`),
                                      icon: <FaEdit className="h-3 sm:h-4 w-3 sm:w-4" />,
                                      className: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1',
                                    },
                                  ]
                                  : []),
                                ...(exam.status === 'scheduled'
                                  ? [
                                    {
                                      label: 'Activate',
                                      onClick: () => handleActivateExam(exam._id),
                                      icon: <FaPlayCircle className="h-3 sm:h-4 w-3 sm:w-4" />,
                                      className: 'bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1',
                                    },
                                    {
                                      label: 'Edit',
                                      onClick: () => navigate(`/teacher/exams/${exam._id}/edit`),
                                      icon: <FaEdit className="h-3 sm:h-4 w-3 sm:w-4" />,
                                      className: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1',
                                    },
                                  ]
                                  : []),
                                ...(exam.status === 'active'
                                  ? [
                                    {
                                      label: 'Complete',
                                      onClick: () => handleCompleteExam(exam._id),
                                      icon: <FaCheckCircle className="h-3 sm:h-4 w-3 sm:w-4" />,
                                      className: 'bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1',
                                    },
                                    {
                                      label: 'View Submissions',
                                      onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`),
                                      icon: <FaEye className="h-3 sm:h-4 w-3 sm:w-4" />,
                                      className: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1',
                                    },
                                  ]
                                  : []),
                                ...(exam.status === 'completed'
                                  ? [
                                    {
                                      label: 'View Submissions',
                                      onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`),
                                      icon: <FaEye className="h-3 sm:h-4 w-3 sm:w-4" />,
                                      className: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 py-1',
                                    },
                                  ]
                                  : []),
                                {
                                  label: 'Delete',
                                  onClick: () => handleDeleteExam(exam._id),
                                  icon: <FaTrash className="h-3 sm:h-4 w-3 sm:w-4" />,
                                  variant: 'danger',
                                  className: 'bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1',
                                },
                              ]}
                              className="bg-white border-indigo-200 hover:bg-indigo-50 transition-all duration-200 m-2 sm:m-4 p-2 sm:p-4"
                            />
                          ))
                      )}
                      {key === 'completed' && groupedExams.completed.length > 5 && (
                        <div className="text-center pt-3 sm:pt-4">
                          <Button
                            as={Link}
                            to="/teacher/exams?status=completed"
                            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm sm:text-base mx-auto"
                            aria-label="View all completed exams"
                          >
                            View All Completed Exams
                            <FaArrowRight className="h-3 sm:h-4 w-3 sm:w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
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