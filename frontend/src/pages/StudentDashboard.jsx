import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import examService from '../services/examService';
import submissionService from '../services/submissionService';

const StudentDashboard = () => {
  const { currentUser } = useAuth();
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch upcoming exams
        const examsData = await examService.getUpcomingExamsForStudent();
        setUpcomingExams(examsData);

        // Fetch recent submissions
        const submissionsData = await submissionService.getStudentSubmissions();
        // Only show the 5 most recent submissions
        setRecentSubmissions(submissionsData.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {currentUser?.fullName}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Exams */}
          <Card title="Upcoming Exams">
            {upcomingExams.length === 0 ? (
              <p className="text-gray-500">No upcoming exams scheduled</p>
            ) : (
              <div className="space-y-4">
                {upcomingExams.map((exam) => (
                  <div key={exam._id} className="border rounded-md p-4 bg-white shadow-sm">
                    <h3 className="font-medium">{exam.title}</h3>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Subject: {exam.subject.name}</p>
                      <p>
                        Date: {new Date(exam.schedule.start).toLocaleDateString()}
                      </p>
                      <p>
                        Time: {new Date(exam.schedule.start).toLocaleTimeString()}
                      </p>
                      <p>Duration: {exam.schedule.duration} minutes</p>
                      <p>Teacher: {exam.teacher.fullName}</p>
                    </div>
                    <div className="mt-3">                      <Button
                      as={Link}
                      to={`/student/exams/${exam._id}`}
                      variant="primary"
                      size="sm"
                    >
                      View Details
                    </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <Button
                as={Link}
                to="/student/exams"
                variant="secondary"
              >
                View All Exams
              </Button>
            </div>
          </Card>

          {/* Recent Submissions */}
          <Card title="Recent Submissions">
            {recentSubmissions.length === 0 ? (
              <p className="text-gray-500">No recent exam submissions</p>
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map((submission) => (
                  <div key={submission._id} className="border rounded-md p-4 bg-white shadow-sm">
                    <h3 className="font-medium">
                      {submission.exam ? submission.exam.title : 'Exam Deleted'}
                    </h3>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>
                        Subject: {submission.exam && submission.exam.subject && submission.exam.subject.name
                          ? submission.exam.subject.name
                          : 'N/A'}
                      </p>
                      <p>
                        Submitted: {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                      <p>
                        Score: {submission.status === 'graded' && submission.totalScore !== undefined && submission.exam && submission.exam.totalScore !== undefined
                          ? `${submission.totalScore} / ${submission.exam.totalScore}`
                          : 'Pending'}
                      </p>
                    </div>
                    <div className="mt-3">
                      <Button
                        as={Link}
                        to={`/student/submissions/${submission._id}`}
                        variant="secondary"
                        size="sm"
                        disabled={!submission.exam}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <Button
                as={Link}
                to="/student/results"
                variant="secondary"
              >
                View All Results
              </Button>
            </div>
          </Card>

          {/* Academic Progress */}
          <Card title="Academic Progress">
            <div className="text-center py-8">
              <Link to="/student/results">
                <Button variant="primary">View Performance Report</Button>
              </Link>
            </div>
          </Card>

          {/* Profile Information */}
          <Card title="Profile Information">
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Full Name:</span>
                <span className="ml-2">{currentUser?.fullName}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Registration Number:</span>
                <span className="ml-2">{currentUser?.registrationNumber}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2">{currentUser?.email}</span>
              </div>
              {currentUser?.class && (
                <div>
                  <span className="font-medium text-gray-700">Class:</span>
                  <span className="ml-2">
                    {`${currentUser.class.level}${currentUser.class.trade}`}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Button
                as={Link}
                to="/student/profile"
                variant="secondary"
              >
                Edit Profile
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default StudentDashboard;
