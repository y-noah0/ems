/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import DynamicTable from '../components/class/DynamicTable';
import examService from '../services/examService';
import submissionService from '../services/submissionService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiBookOpen,
  FiUser,
  FiClock,
  FiTarget,
  FiList,
  FiPlayCircle,
  FiCheckCircle,
  FiFileText
} from 'react-icons/fi';

const StudentExamDetails = () => {
  const { currentUser } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchExamDetails = async () => {
      setLoading(true);
      setError('');
      try {
        if (!currentUser?.school) {
          throw new Error('School ID not found. Please ensure you are logged in correctly.');
        }
        const schoolId = currentUser.school;
        const examData = await examService.getExamById(examId, schoolId);

        if (examData.schedule?.start && examData.schedule?.duration) {
          const start = new Date(examData.schedule.start);
          examData.schedule.end = new Date(start.getTime() + examData.schedule.duration * 60 * 1000);
        }
        setExam(examData);

        const studentSubmissions = await submissionService.getStudentSubmissions(schoolId);
        const examSubmissions = studentSubmissions.filter(
          (submission) => submission.exam?._id === examId || submission.exam === examId
        );
        setSubmissions(examSubmissions);
      } catch (error) {
        setError(error.message || 'Failed to load exam details');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchExamDetails();
    } else {
      setLoading(false);
      setError('User not authenticated. Please log in.');
    }
  }, [examId, currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusInfo = (exam) => {
    if (!exam) return { label: 'Unknown', color: 'gray' };

    const now = new Date();
    const start = exam.schedule?.start ? new Date(exam.schedule.start) : null;
    const end = exam.schedule?.end ? new Date(exam.schedule.end) : null;

    if (exam.status === 'draft') {
      return { label: 'Draft', color: 'gray' };
    } else if (exam.status === 'scheduled') {
      if (!start || start > now) {
        return { label: 'Upcoming', color: 'blue' };
      } else if (start <= now && end >= now) {
        return { label: 'In Progress', color: 'green' };
      } else {
        return { label: 'Past', color: 'gray' };
      }
    } else if (exam.status === 'active') {
      return { label: 'Active', color: 'green' };
    } else if (exam.status === 'completed') {
      return { label: 'Completed', color: 'purple' };
    }
    return { label: 'Unknown', color: 'gray' };
  };

  const isExamAvailable = () => {
    if (!exam) return false;

    const now = new Date();
    const start = exam.schedule?.start ? new Date(exam.schedule.start) : null;
    const end = exam.schedule?.end ? new Date(exam.schedule.end) : null;

    return (
      exam.status === 'active' ||
      (exam.status === 'scheduled' && start && start <= now && end && end >= now)
    );
  };

  const hasCompletedExam = () => {
    return submissions.some((submission) => submission.status === 'graded');
  };

  const submissionsColumns = [
    {
      key: 'submittedAt',
      title: 'Date',
      render: (value) => <span className="text-sm">{new Date(value).toLocaleString()}</span>
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'graded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
        >
          {value}
        </span>
      )
    },
    {
      key: 'totalScore',
      title: 'Score',
      render: (value) => (
        <span className="text-sm font-medium">
          {value !== undefined ? `${value}/${exam?.totalPoints || 100}` : '-'}
        </span>
      )
    }
  ];

  const handleTakeExam = () => navigate(`/student/take-exam/${examId}`);
  const handleViewResults = () => {
    const submission = submissions.find((s) => s.status === 'graded');
    if (submission) navigate(`/student/submissions/${submission._id}`);
  };

  return (
    <Layout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 select-none">
            <FiFileText className="text-blue-600" /> Exam Details
          </h1>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/student/exams')}>
          <FiArrowLeft className="mr-1" /> Back
        </Button>
      </motion.div>

      {/* Loading / Error / Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="h-12 w-12 border-b-4 border-blue-600 rounded-full"
          />
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-300 text-red-700 px-6 py-4 rounded-lg font-medium shadow-sm"
        >
          {error}
        </motion.div>
      ) : exam ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-2xl shadow-xl bg-white max-w-4xl mx-auto"
        >
          {/* Status gradient */}
          <div
            className={`h-2 rounded-t-xl bg-gradient-to-r from-${getStatusInfo(exam).color}-400 to-${getStatusInfo(exam).color}-600`}
          />
          <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 tracking-tight select-none">
              <FiBookOpen className="text-blue-600 text-3xl" /> {exam.title}
            </h2>

            {/* Exam Info Grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-gray-700 mb-8 select-none">
              <div className="flex items-center gap-2">
                <FiBookOpen className="text-blue-500 text-xl" />
                <span className="font-semibold">Subject:</span>
                <span className="ml-auto font-medium">{exam.subject?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiList className="text-green-500 text-xl" />
                <span className="font-semibold">Type:</span>
                <span className="ml-auto font-medium">{exam.type || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiUser className="text-purple-500 text-xl" />
                <span className="font-semibold">Teacher:</span>
                <span className="ml-auto font-medium">{exam.teacher?.fullName || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiClock className="text-yellow-500 text-xl" />
                <span className="font-semibold">Start:</span>
                <span className="ml-auto font-medium">{formatDate(exam.schedule?.start)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiClock className="text-yellow-500 text-xl" />
                <span className="font-semibold">End:</span>
                <span className="ml-auto font-medium">{formatDate(exam.schedule?.end)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiTarget className="text-red-500 text-xl" />
                <span className="font-semibold">Duration:</span>
                <span className="ml-auto font-medium">{exam.schedule?.duration} mins</span>
              </div>
              <div className="flex items-center gap-2">
                <FiTarget className="text-red-500 text-xl" />
                <span className="font-semibold">Total Points:</span>
                <span className="ml-auto font-medium">{exam.totalPoints || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiPlayCircle
                  className={`text-${getStatusInfo(exam).color}-500 text-xl`}
                />
                <span className="font-semibold">Status:</span>
                <span
                  className={`ml-auto px-3 py-1 rounded-full text-sm bg-${getStatusInfo(exam).color}-100 text-${getStatusInfo(exam).color}-800 font-semibold select-text`}
                >
                  {getStatusInfo(exam).label}
                </span>
              </div>
            </div>

            {/* Instructions */}
            {exam.instructions && (
              <div className="mt-6 prose max-w-none text-gray-600">
                <h3 className="font-semibold mb-3 flex items-center gap-2 select-none">
                  <FiFileText className="text-indigo-600 text-xl" /> Instructions
                </h3>
                <div dangerouslySetInnerHTML={{ __html: exam.instructions }} />
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex gap-4 select-none">
              {isExamAvailable() && !hasCompletedExam() && (
                <Button variant="primary" onClick={handleTakeExam}>
                  Take Exam
                </Button>
              )}
              {hasCompletedExam() && (
                <Button variant="secondary" onClick={handleViewResults}>
                  View Results
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-lg font-semibold shadow-sm max-w-4xl mx-auto select-none">
          Exam not found.
        </div>
      )}

      {/* Submissions */}
      {submissions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-10 overflow-hidden rounded-2xl shadow-xl bg-white p-8 max-w-4xl mx-auto"
        >
          <h3 className="text-2xl font-bold mb-6 select-none">Your Submissions</h3>
          <DynamicTable
            data={submissions}
            columns={submissionsColumns}
            emptyMessage="No submissions available"
          />
        </motion.div>
      )}
    </Layout>
  );
};

export default StudentExamDetails;
