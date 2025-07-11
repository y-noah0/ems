import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import examService from '../services/examService';

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        const examsData = await examService.getTeacherExams();
        setExams(examsData);
      } catch (error) {
        console.error('Error fetching exams:', error);
        setError('Failed to load exams');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  // Group exams by status
  const groupedExams = {
    draft: exams.filter(exam => exam.status === 'draft'),
    scheduled: exams.filter(exam => exam.status === 'scheduled'),
    active: exams.filter(exam => exam.status === 'active'),
    completed: exams.filter(exam => exam.status === 'completed')
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {currentUser?.fullName}
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Your Exams</h2>
        <Button as={Link} to="/teacher/exams/create">
          Create New Exam
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Draft Exams */}
          <Card title="Draft Exams">
            {groupedExams.draft.length === 0 ? (
              <p className="text-gray-500">No draft exams available</p>
            ) : (
              <div className="space-y-4">
                {groupedExams.draft.map(exam => (
                  <div key={exam._id} className="border rounded-md p-4 bg-white shadow-sm">
                    <h3 className="font-medium">{exam.title}</h3>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Subject: {exam.subject.name}</p>
                      <p>Class: {`${exam.class.level}${exam.class.trade}`}</p>
                      <p>Type: {exam.type.toUpperCase()}</p>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button
                        as={Link}
                        to={`/teacher/exams/${exam._id}/edit`}
                        variant="primary"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        as={Link}
                        to={`/teacher/exams/${exam._id}/schedule`}
                        variant="secondary"
                        size="sm"
                      >
                        Schedule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Scheduled Exams */}
          <Card title="Scheduled Exams">
            {groupedExams.scheduled.length === 0 ? (
              <p className="text-gray-500">No scheduled exams available</p>
            ) : (
              <div className="space-y-4">
                {groupedExams.scheduled.map(exam => (
                  <div key={exam._id} className="border rounded-md p-4 bg-white shadow-sm">
                    <h3 className="font-medium">{exam.title}</h3>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Subject: {exam.subject.name}</p>
                      <p>Class: {`${exam.class.level}${exam.class.trade}`}</p>
                      <p>Scheduled: {new Date(exam.schedule.start).toLocaleString()}</p>
                      <p>Duration: {exam.schedule.duration} minutes</p>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button
                        as={Link}
                        to={`/teacher/exams/${exam._id}`}
                        variant="primary"
                        size="sm"
                      >
                        View
                      </Button>
                      <Button
                        onClick={() => examService.activateExam(exam._id)}
                        variant="success"
                        size="sm"
                      >
                        Activate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Active Exams */}
          <Card title="Active Exams">
            {groupedExams.active.length === 0 ? (
              <p className="text-gray-500">No active exams available</p>
            ) : (
              <div className="space-y-4">
                {groupedExams.active.map(exam => (
                  <div key={exam._id} className="border rounded-md p-4 bg-white shadow-sm">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{exam.title}</h3>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Subject: {exam.subject.name}</p>
                      <p>Class: {`${exam.class.level}${exam.class.trade}`}</p>
                      <p>Started: {new Date(exam.schedule.start).toLocaleString()}</p>
                    </div>
                    <div className="mt-3 flex space-x-2">                      <Button
                        as={Link}
                        to={`/teacher/exams/${exam._id}/results`}
                        variant="primary"
                        size="sm"
                      >
                        View Results
                      </Button>
                      <Button
                        onClick={() => examService.completeExam(exam._id)}
                        variant="warning"
                        size="sm"
                      >
                        Complete Exam
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Completed Exams */}
          <Card title="Completed Exams">
            {groupedExams.completed.length === 0 ? (
              <p className="text-gray-500">No completed exams available</p>
            ) : (
              <div className="space-y-4">
                {groupedExams.completed.slice(0, 5).map(exam => (
                  <div key={exam._id} className="border rounded-md p-4 bg-white shadow-sm">
                    <h3 className="font-medium">{exam.title}</h3>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Subject: {exam.subject.name}</p>
                      <p>Class: {`${exam.class.level}${exam.class.trade}`}</p>
                      <p>Completed: {new Date(exam.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3">                      <Button
                        as={Link}
                        to={`/teacher/exams/${exam._id}/results`}
                        variant="secondary"
                        size="sm"
                      >
                        View & Grade Results
                      </Button>
                    </div>
                  </div>
                ))}
                {groupedExams.completed.length > 5 && (
                  <div className="text-center pt-2">
                    <Button
                      as={Link}
                      to="/teacher/exams?status=completed"
                      variant="link"
                    >
                      View All Completed Exams
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default TeacherDashboard;
