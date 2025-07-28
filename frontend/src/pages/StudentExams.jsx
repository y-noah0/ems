/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService';
import { useAuth } from '../context/AuthContext';

const StudentExams = () => {
  const { currentUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchExams = async () => {
    setLoading(true);
    setError('');
    try {
      const examsData = await examService.getStudentClassExams();
      console.log('Raw API response:', examsData);
      if (!Array.isArray(examsData)) {
        throw new Error('Invalid response: exams is not an array');
      }
      const updatedExams = examsData.map(exam => {
        if (exam?.schedule?.start && exam?.schedule?.duration) {
          const start = new Date(exam.schedule.start);
          if (isNaN(start.getTime())) {
            console.warn(`Invalid start date for exam ${exam._id}:`, exam.schedule.start);
            return exam;
          }
          const end = new Date(start.getTime() + exam.schedule.duration * 60 * 1000);
          return { ...exam, schedule: { ...exam.schedule, end } };
        }
        return exam;
      });
      console.log('Updated exams:', updatedExams);
      setExams(updatedExams);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError(error.message || 'Failed to load exams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (currentUser && isMounted) {
      console.log('Fetching exams for user:', currentUser?._id);
      fetchExams();
    } else if (!currentUser) {
      setLoading(false);
      setError('User not authenticated. Please log in.');
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const filteredExams = () => {
    if (!Array.isArray(exams)) {
      console.log('No exams to filter:', exams);
      return [];
    }
    const now = new Date();
    try {
      const filtered = (() => {
        switch (filter) {
          case 'upcoming':
            return exams.filter(exam => {
              if (!exam || exam.status !== 'scheduled') return false;
              const start = exam.schedule?.start ? new Date(exam.schedule.start) : null;
              return start && !isNaN(start.getTime()) && start > now;
            });
          case 'past':
            return exams.filter(exam => {
              if (!exam) return false;
              if (exam.status === 'completed') return true;
              const end = exam.schedule?.end ? new Date(exam.schedule.end) : null;
              return end && !isNaN(end.getTime()) && end < now;
            });
          case 'current':
            return exams.filter(exam => {
              if (!exam) return false;
              if (exam.status === 'active') return true;
              const start = exam.schedule?.start ? new Date(exam.schedule.start) : null;
              const end = exam.schedule?.end ? new Date(exam.schedule.end) : null;
              return (
                start &&
                end &&
                !isNaN(start.getTime()) &&
                !isNaN(end.getTime()) &&
                start <= now &&
                end >= now
              );
            });
          default:
            return exams;
        }
      })();
      console.log(`Filtered exams (${filter}):`, filtered);
      return filtered;
    } catch (error) {
      console.error('Error filtering exams:', error);
      return exams;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'Invalid date';
    }
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getStatusInfo = (exam) => {
    if (!exam || !exam.status) {
      return { label: 'Unknown', color: 'gray' };
    }
    const now = new Date();
    const start = exam.schedule?.start ? new Date(exam.schedule.start) : null;
    const end = exam.schedule?.end ? new Date(exam.schedule.end) : null;

    switch (exam.status) {
      case 'draft':
        return { label: 'Draft', color: 'gray' };
      case 'scheduled':
        if (!start || isNaN(start.getTime())) {
          return { label: 'Scheduled', color: 'blue' };
        }
        if (start > now) {
          return { label: 'Upcoming', color: 'blue' };
        }
        if (end && !isNaN(end.getTime()) && start <= now && end >= now) {
          return { label: 'In Progress', color: 'green' };
        }
        return { label: 'Past', color: 'gray' };
      case 'active':
        return { label: 'Active', color: 'green' };
      case 'completed':
        return { label: 'Completed', color: 'purple' };
      default:
        return { label: 'Unknown', color: 'gray' };
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <p className="mt-1 text-gray-600">View all exams for your class</p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            onClick={() => setFilter('all')}
          >
            All Exams
          </button>
          <button
            className={`px-4 py-2 rounded-md ${filter === 'upcoming' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`px-4 py-2 rounded-md ${filter === 'current' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            onClick={() => setFilter('current')}
          >
            Current
          </button>
          <button
            className={`px-4 py-2 rounded-md ${filter === 'past' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            onClick={() => setFilter('past')}
          >
            Past
          </button>
        </div>
        <Button onClick={fetchExams} variant="secondary" size="sm" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Exams'}
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
      ) : filteredExams().length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">
              {exams.length === 0
                ? 'No exams available for your class.'
                : `No ${filter} exams found.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredExams().map(exam => {
            const statusInfo = getStatusInfo(exam);
            return (
              <Card key={exam._id}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      {exam.title || 'Untitled Exam'}
                    </h2>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-600">
                        Subject: {exam.subject?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Type: {exam.type || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Teacher: {exam.teacher?.fullName || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Schedule:{' '}
                        {exam.schedule?.start
                          ? `${formatDate(exam.schedule.start)} - ${formatDate(
                            exam.schedule.end
                          )}`
                          : 'Not scheduled'}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <Button
                      as={Link}
                      to={`/student/exams/${exam._id}`}
                      variant="primary"
                      size="sm"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default StudentExams;