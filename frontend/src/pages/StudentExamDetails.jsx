import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService'; // Make sure this is the correct file!
import submissionService from '../services/submissionService';

const StudentExamDetails = () => {
  const { examId } = useParams(); // Use 'examId' to match backend route param
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchExamDetails = async () => {
      setLoading(true);
      try {
        // Fetch exam data
        const examData = await examService.getExamById(examId);
        setExam(examData);

        // Fetch student's submissions for this exam if any
        const studentSubmissions = await submissionService.getStudentSubmissions();
        const examSubmissions = studentSubmissions.filter(
          submission => submission.exam._examId === examId || submission.exam === examId
        );
        setSubmissions(examSubmissions);
      } catch (error) {
        console.error('Error fetching exam details:', error);
        setError(error.message || 'Failed to load exam details');
      } finally {
        setLoading(false);
      }
    };

    fetchExamDetails();
  }, [examId]);

  // Format the date nicely
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get the exam status label and color
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

  // Check if the exam is available to take
  const isExamAvailable = () => {
    if (!exam) return false;

    const now = new Date();
    const start = exam.schedule?.start ? new Date(exam.schedule.start) : null;
    const end = exam.schedule?.end ? new Date(exam.schedule.end) : null;

    return (
      exam.status === 'active' ||
      (exam.status === 'scheduled' &&
        start && start <= now &&
        end && end >= now)
    );
  };

  // Check if student has already completed this exam
  const hasCompletedExam = () => {
    return submissions.some(submission =>
      submission.status === 'completed' ||
      submission.status === 'graded'
    );
  };

  // Handle take exam button click
  const handleTakeExam = () => {
    navigate(`/student/take-exam/${id}`);
  };

  // Handle view results button click
  const handleViewResults = () => {
    // Find the completed submission
    const completedSubmission = submissions.find(submission =>
      submission.status === 'completed' ||
      submission.status === 'graded'
    );

    if (completedSubmission) {
      navigate(`/student/results?submissionId=${completedSubmission._id}`);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exam Details</h1>
        <Button
          variant="secondary"
          className="mt-2"
          onClick={() => navigate('/student/exams')}
          size="sm"
        >
          Back to Exams
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      ) : exam ? (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-xl font-semibold text-gray-900">{exam.title}</h2>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Subject:</span>
                    <span className="font-medium">{exam.subject?.name}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Type:</span>
                    <span className="font-medium">{exam.type}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Teacher:</span>
                    <span className="font-medium">{exam.teacher?.fullName}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Start Time:</span>
                    <span className="font-medium">{formatDate(exam.schedule?.start)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">End Time:</span>
                    <span className="font-medium">{formatDate(exam.schedule?.end)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Duration:</span>
                    <span className="font-medium">{exam.schedule?.duration || exam.duration} minutes</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Total Points:</span>
                    <span className="font-medium">{exam.totalPoints || '-'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Status:</span>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full bg-${getStatusInfo(exam).color}-100 text-${getStatusInfo(exam).color}-800`}
                    >
                      {getStatusInfo(exam).label}
                    </span>
                  </div>
                </div>

                {exam.description && (
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-900 mb-2">Description:</h3>
                    <p className="text-gray-700">{exam.description}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {isExamAvailable() && !hasCompletedExam() && (
                  <Button
                    variant="primary"
                    onClick={handleTakeExam}
                  >
                    Take Exam
                  </Button>
                )}

                {hasCompletedExam() && (
                  <Button
                    variant="secondary"
                    onClick={handleViewResults}
                  >
                    View Results
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {exam.instructions && (
            <Card title="Exam Instructions">
              <div dangerouslySetInnerHTML={{ __html: exam.instructions }} />
            </Card>
          )}

          {submissions.length > 0 && (
            <Card title="Your Submissions">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.map((submission) => (
                      <tr key={submission._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(submission.startTime).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${submission.status === 'graded'
                              ? 'bg-green-100 text-green-800'
                              : submission.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : submission.status === 'in-progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {submission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.score !== undefined && submission.totalPoints
                            ? `${submission.score}/${submission.totalPoints}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          Exam not found.
        </div>
      )}
    </Layout>
  );
};

export default StudentExamDetails;
