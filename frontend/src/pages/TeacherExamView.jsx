import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DynamicTable from '../components/class/DynamicTable';
import examService from '../services/examService';
import { useAuth } from '../context/AuthContext';

const TeacherExamView = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('exam');
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        const examData = await examService.getExamById(examId);
        const submissionsData = await examService.getExamSubmissions(examId);
        
        setExam(examData);
        setSubmissions(submissionsData);
      } catch (error) {
        console.error('Error fetching exam data:', error);
        setError('Failed to load exam details');
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  // Submission table columns
  const submissionColumns = [
    { 
      key: 'student', 
      title: 'Student Name',
      render: (value, item) => (
        <div className="text-sm font-medium text-gray-900">
          {item.student?.fullName || 'Unknown Student'}
        </div>
      )
    },
    { 
      key: 'student', 
      title: 'Registration No.',
      render: (value, item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {item.student?.registrationNumber || 'N/A'}
        </span>
      )
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (value) => {
        const statusColors = {
          'submitted': 'bg-blue-100 text-blue-800',
          'graded': 'bg-green-100 text-green-800',
          'pending': 'bg-yellow-100 text-yellow-800',
          'not_submitted': 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[value] || statusColors.pending}`}>
            {value?.replace('_', ' ').toUpperCase() || 'PENDING'}
          </span>
        );
      }
    },
    { 
      key: 'score', 
      title: 'Score',
      render: (value, item) => (
        <span className="text-sm font-medium text-gray-900">
          {item.status === 'graded' ? `${value || 0}/${exam?.totalPoints || 100}` : 'Not graded'}
        </span>
      )
    },
    { 
      key: 'submittedAt', 
      title: 'Submitted At',
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleString() : 'Not submitted'}
        </span>
      )
    }
  ];

  // Action handlers
  const handleGradeSubmission = (submission) => {
    navigate(`/teacher/submissions/${submission._id}/grade`);
  };

  const handleViewSubmission = (submission) => {
    navigate(`/teacher/submissions/${submission._id}`);
  };

  const handleEditExam = () => {
    navigate(`/teacher/exams/${examId}/edit`);
  };

  const handleDeleteExam = async () => {
    if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return;
    }

    try {
      await examService.deleteExam(examId);
      navigate('/teacher/exams');
    } catch (error) {
      console.error('Error deleting exam:', error);
      setError('Failed to delete exam');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Button onClick={() => navigate('/teacher/exams')} variant="secondary">
          Back to Exams
        </Button>
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <div className="text-center py-8 text-gray-500">
          Exam not found
        </div>
        <Button onClick={() => navigate('/teacher/exams')} variant="secondary">
          Back to Exams
        </Button>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <Button 
              onClick={() => navigate('/teacher/exams')} 
              variant="secondary" 
              size="sm"
              className="mb-4"
            >
              ← Back to Exams
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
            <p className="mt-1 text-gray-600">
              {exam.subject} • {exam.class}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleEditExam} variant="primary" size="sm">
              Edit Exam
            </Button>
            <Button onClick={handleDeleteExam} variant="danger" size="sm">
              Delete Exam
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('exam')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'exam'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Exam Details
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'submissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Submissions ({submissions.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'exam' && (
        <div className="space-y-6">
          {/* Exam Overview */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Exam Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Status</p>
                <p className="text-2xl font-bold text-blue-900 capitalize">{exam.status}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-600">Total Points</p>
                <p className="text-2xl font-bold text-green-900">{exam.totalPoints || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-purple-600">Questions</p>
                <p className="text-2xl font-bold text-purple-900">{exam.questions?.length || 0}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-orange-600">Duration</p>
                <p className="text-2xl font-bold text-orange-900">{exam.duration || 0} min</p>
              </div>
            </div>
          </Card>

          {/* Exam Details */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Time</p>
                  <p className="text-sm text-gray-900">
                    {exam.startTime ? new Date(exam.startTime).toLocaleString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">End Time</p>
                  <p className="text-sm text-gray-900">
                    {exam.endTime ? new Date(exam.endTime).toLocaleString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Subject</p>
                  <p className="text-sm text-gray-900">{exam.subject || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Class</p>
                  <p className="text-sm text-gray-900">{exam.class || 'Not specified'}</p>
                </div>
              </div>
              {exam.description && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Description</p>
                  <p className="text-sm text-gray-900">{exam.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Questions Preview */}
          {exam.questions && exam.questions.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">Questions ({exam.questions.length})</h2>
              <div className="space-y-4">
                {exam.questions.slice(0, 3).map((question, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm font-medium text-gray-900">
                      {index + 1}. {question.question}
                    </p>
                    <p className="text-sm text-gray-500">
                      Points: {question.points} • Type: {question.type}
                    </p>
                  </div>
                ))}
                {exam.questions.length > 3 && (
                  <p className="text-sm text-gray-500">
                    ... and {exam.questions.length - 3} more questions
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'submissions' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Student Submissions</h2>
            <div className="flex space-x-2">
              <Button
                onClick={() => navigate(`/teacher/exams/${examId}/results`)}
                variant="secondary"
                size="sm"
              >
                View Results Summary
              </Button>
              <Button
                onClick={() => navigate(`/teacher/exams/${examId}/export`)}
                variant="secondary"
                size="sm"
              >
                Export Results
              </Button>
            </div>
          </div>

          <DynamicTable
            data={submissions}
            columns={submissionColumns}
            showActions={true}
            emptyMessage="No submissions yet"
            containerWidth="100%"
            containerHeight="auto"
            renderCustomActions={(submission) => (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewSubmission(submission)}
                  className="text-blue-600 hover:text-blue-900 transition-colors"
                >
                  View
                </button>
                {submission.status === 'submitted' && (
                  <button
                    onClick={() => handleGradeSubmission(submission)}
                    className="text-green-600 hover:text-green-900 transition-colors"
                  >
                    Grade
                  </button>
                )}
              </div>
            )}
          />
        </Card>
      )}
    </Layout>
  );
};

export default TeacherExamView;
