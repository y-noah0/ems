import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSearch, FaFilter, FaEye, FaEdit, FaArrowLeft, FaInfoCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DynamicTable from '../components/class/DynamicTable';
import examService from '../services/examService';
import { useAuth } from '../context/AuthContext';

// Animation variants for Framer Motion
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const SubmissionStats = ({ submissions, exam }) => {
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.status === 'graded').length;
  const pendingSubmissions = submissions.filter(s => ['in-progress', 'submitted', 'auto-submitted'].includes(s.status)).length;

  const averageScore = gradedSubmissions > 0
    ? Math.round(
      submissions
        .filter(s => s.status === 'graded')
        .reduce((sum, s) => sum + (s.totalScore || 0), 0) / gradedSubmissions
    )
    : 0;

  const scores = submissions
    .filter(s => s.status === 'graded')
    .map(s => s.totalScore || 0);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

  const gradeDistribution = submissions
    .filter(s => s.status === 'graded')
    .reduce((acc, s) => {
      const percentage = ((s.totalScore || 0) / (exam?.totalPoints || 100)) * 100;
      if (percentage >= 90) acc.A += 1;
      else if (percentage >= 80) acc.B += 1;
      else if (percentage >= 70) acc.C += 1;
      else if (percentage >= 60) acc.D += 1;
      else acc.F += 1;
      return acc;
    }, { A: 0, B: 0, C: 0, D: 0, F: 0 });

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
      }}
    >
      {[
        {
          title: 'Submissions',
          value: totalSubmissions,
          details: (
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-green-600 font-inter">{gradedSubmissions} Graded</span>
              <span className="text-yellow-600 font-inter">{pendingSubmissions} Pending</span>
            </div>
          ),
          borderColor: 'border-blue-500',
        },
        {
          title: 'Average Score',
          value: `${averageScore}/${exam?.totalPoints || 100}`,
          details: (
            <p className="text-sm text-gray-600 mt-2 font-inter">
              {averageScore ? `${Math.round((averageScore / (exam?.totalPoints || 100)) * 100)}%` : 'No scores yet'}
            </p>
          ),
          borderColor: 'border-green-500',
        },
        {
          title: 'Highest / Lowest',
          value: (
            <div className="flex justify-between mt-2">
              <div>
                <p className="text-xl font-bold text-gray-800 font-inter">{highestScore}</p>
                <p className="text-xs text-gray-500 font-inter">Max</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800 font-inter">{lowestScore}</p>
                <p className="text-xs text-gray-500 font-inter">Min</p>
              </div>
            </div>
          ),
          borderColor: 'border-purple-500',
        },
        {
          title: 'Grade Distribution',
          value: (
            <div className="flex justify-between mt-2 text-sm">
              {Object.entries(gradeDistribution).map(([grade, count]) => (
                <div key={grade} className="text-center">
                  <p className="font-bold font-inter">{grade}</p>
                  <p className="font-inter">{count}</p>
                </div>
              ))}
            </div>
          ),
          borderColor: 'border-yellow-500',
        },
      ].map((stat, index) => (
        <motion.div
          key={index}
          className={`bg-white rounded-lg shadow p-4 border-l-4 ${stat.borderColor} transition-transform duration-300 hover:scale-105`}
          variants={cardVariants}
        >
          <h3 className="text-lg font-medium text-gray-700 font-inter">{stat.title}</h3>
          <div className="mt-2">{typeof stat.value === 'string' ? <p className="text-3xl font-bold text-gray-800 font-inter">{stat.value}</p> : stat.value}</div>
          {stat.details}
        </motion.div>
      ))}
    </motion.div>
  );
};

const ExamResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const schoolId = currentUser?.school;
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!schoolId) {
      setError('No school ID found. Please log in again.');
      setIsLoading(false);
      return;
    }

    const fetchExamData = async () => {
      try {
        setIsLoading(true);
        const examData = await examService.getExamById(examId, schoolId);
        setExam(examData);
        const submissionsData = await examService.getExamSubmissions(examId, schoolId);
        setSubmissions(submissionsData);
        setFilteredSubmissions(submissionsData);
      } catch (err) {
        setError('Failed to load exam results. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamData();
  }, [examId, schoolId]);

  useEffect(() => {
    if (!submissions.length) {
      setFilteredSubmissions([]);
      return;
    }

    let filtered = [...submissions];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(submission => submission.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(submission =>
        (submission.student?.fullName?.toLowerCase() || '').includes(term) ||
        (submission.student?.registrationNumber?.toLowerCase() || '').includes(term)
      );
    }
    setFilteredSubmissions(filtered);
  }, [submissions, searchTerm, statusFilter]);

  const submissionColumns = [
    {
      key: 'student',
      title: 'Student Name',
      render: (_, item) => (
        <div className="text-sm font-medium text-gray-900 font-inter">{item.student?.fullName || 'Unknown Student'}</div>
      ),
    },
    {
      key: 'student',
      title: 'Registration No.',
      render: (_, item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 font-inter">
          {item.student?.registrationNumber || 'N/A'}
        </span>
      ),
    },
    {
      key: 'totalScore',
      title: 'Score',
      render: (value, item) => (
        <span className="text-sm font-medium text-gray-900 font-inter">
          {item.status === 'graded' ? `${value || 0}/${exam?.totalPoints || 100}` : 'Not graded'}
        </span>
      ),
    },
    {
      key: 'percentage',
      title: 'Percentage',
      render: (value, item) => {
        if (item.status === 'graded') {
          const percentage = item.percentage || ((item.totalScore || 0) / (exam?.totalPoints || 100)) * 100;
          const colorClass = percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600';
          return <span className={`text-sm font-medium ${colorClass} font-inter`}>{percentage.toFixed(1)}%</span>;
        }
        return <span className="text-sm text-gray-500 font-inter">-</span>;
      },
    },
    {
      key: 'submittedAt',
      title: 'Submission Date',
      render: (value) => (
        <span className="text-sm text-gray-500 font-inter">
          {value ? new Date(value).toLocaleString() : 'Not submitted'}
        </span>
      ),
    },
  ];

  const handleViewSubmission = (submission) => {
    navigate(`/teacher/submissions/${submission._id}`);
  };

  const handleGradeSubmission = (submission) => {
    navigate(`/teacher/submissions/${submission._id}/grade`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <motion.div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <motion.div
          className="mx-auto my-8 max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <div className="p-6 text-center">
              <div className="text-red-500 text-xl mb-4 font-inter">{error}</div>
              <Button
                onClick={() => navigate('/teacher/dashboard')}
                className="inline-flex items-center space-x-2 transition-colors duration-200 hover:bg-blue-600"
              >
                <FaArrowLeft />
                <span>Return to Dashboard</span>
              </Button>
            </div>
          </Card>
        </motion.div>
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <motion.div
          className="mx-auto my-8 max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <div className="p-6 text-center">
              <div className="text-xl mb-4 font-inter">Exam not found</div>
              <Button
                onClick={() => navigate('/teacher/dashboard')}
                className="inline-flex items-center space-x-2 transition-colors duration-200 hover:bg-blue-600"
              >
                <FaArrowLeft />
                <span>Return to Dashboard</span>
              </Button>
            </div>
          </Card>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 font-inter">
        {/* Header */}
        <motion.div
          className="flex justify-between items-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <span>Exam Results: {exam.title}</span>
            <FaInfoCircle />
          </h1>
          <Button
            onClick={() => navigate('/teacher/dashboard')}
            className="inline-flex items-center space-x-2 transition-colors duration-200 hover:bg-blue-600"
          >
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </Button>
        </motion.div>

        {/* Exam Details */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Exam Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-700">
                    <span className="font-medium">Subject:</span> {exam.subject?.name || 'N/A'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Duration:</span> {exam.schedule?.duration || 'N/A'} minutes
                  </p>
                </div>
                <div>
                  <p className="text-gray-700">
                    <span className="font-medium">Total Questions:</span> {exam.questions?.length || 0}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Maximum Score:</span> {exam.totalPoints || 100}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Submission Statistics */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Exam Statistics</h2>
              <SubmissionStats submissions={submissions} exam={exam} />
            </div>
          </Card>
        </motion.div>

        {/* Filter Controls */}
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center mb-6"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter text-gray-700"
                placeholder="Search by student name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <select
              className="w-full md:w-48 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter text-gray-700"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Submissions</option>
              <option value="in-progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="auto-submitted">Auto-Submitted</option>
              <option value="graded">Graded</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 font-inter">
            <FaFilter />
            <span>{filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'result' : 'results'}</span>
          </div>
        </motion.div>

        {/* Submissions Table */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Student Submissions ({submissions.length})
              </h2>
              <AnimatePresence>
                {filteredSubmissions.length === 0 ? (
                  <motion.div
                    className="text-center py-8 text-gray-500 font-inter"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    No submissions for this exam yet.
                  </motion.div>
                ) : (
                  <DynamicTable
                    data={filteredSubmissions}
                    columns={submissionColumns}
                    showActions={true}
                    emptyMessage="No submissions for this exam yet"
                    containerWidth="100%"
                    containerHeight="auto"
                    renderCustomActions={(submission) => (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewSubmission(submission)}
                          className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-900 transition-colors duration-200 font-inter"
                        >
                          <FaEye />
                          <span>View</span>
                        </button>
                        {['in-progress', 'submitted', 'auto-submitted'].includes(submission.status) && (
                          <button
                            onClick={() => handleGradeSubmission(submission)}
                            className="inline-flex items-center space-x-1 text-green-600 hover:text-green-900 transition-colors duration-200 font-inter"
                          >
                            <FaEdit />
                            <span>Grade</span>
                          </button>
                        )}
                      </div>
                    )}
                  />
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default ExamResults;