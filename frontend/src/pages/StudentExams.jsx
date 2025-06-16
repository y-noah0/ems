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
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'past', 'current'
  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      setError('');
      try {
        const examsData = await examService.getStudentClassExams();
        setExams(Array.isArray(examsData) ? examsData : []);
      } catch (error) {
        console.error('Error fetching exams:', error);
        setError(error.message || 'Failed to load exams. Please try again.');
      } finally {
        setLoading(false);
      }
    };


    fetchExams();
  }, []);
  // Filter exams based on their status and schedule
  const filteredExams = () => {
    if (!Array.isArray(exams)) return [];

    const now = new Date();

    try {
      switch (filter) {
        case 'upcoming':
          return exams.filter(exam =>
            exam && exam.status === 'scheduled' &&
            exam.schedule?.start && new Date(exam.schedule.start) > now
          );
        case 'past':
          return exams.filter(exam =>
            exam && ((exam.status === 'completed') ||
              (exam.schedule?.end && new Date(exam.schedule.end) < now))
          );
        case 'current':
          return exams.filter(exam =>
            exam && (exam.status === 'active' ||
              (exam.schedule?.start && new Date(exam.schedule.start) <= now &&
                exam.schedule?.end && new Date(exam.schedule.end) >= now))
          );
        default:
          return exams;
      }
    } catch (error) {
      console.error('Error filtering exams:', error);
      return exams;
    }
  };

  // Format the date nicely
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  // Get the exam status label and color
  const getStatusInfo = (exam) => {
    if (!exam || !exam.status) {
      return { label: 'Unknown', color: 'gray' };
    }

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

    return { label: exam.status || 'Unknown', color: 'gray' };
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <p className="mt-1 text-gray-600">
          View all exams for your class
        </p>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setFilter('all')}
          >
            All Exams
          </button>
          <button
            className={`px-4 py-2 rounded-md ${filter === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`px-4 py-2 rounded-md ${filter === 'current' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setFilter('current')}
          >
            Current
          </button>
          <button
            className={`px-4 py-2 rounded-md ${filter === 'past' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setFilter('past')}
          >
            Past
          </button>
        </div>
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
        <div className="space-y-4">
          {filteredExams().length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No exams found</p>
              </div>
            </Card>
          ) : (
            filteredExams().map((exam) => {
              const statusInfo = getStatusInfo(exam);
              return (
                <Card key={exam._id}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{exam.title}</h2>                    <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">Subject: {exam.subject?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">Type: {exam.type || 'N/A'}</p>
                        <p className="text-sm text-gray-600">Teacher: {exam.teacher?.fullName || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          Schedule: {exam.schedule ? `${formatDate(exam.schedule.start)} - ${formatDate(exam.schedule.end)}` : 'Not scheduled'}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0">                      <Button
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
            })
          )}
        </div>
      )}
    </Layout>
  );
};

export default StudentExams;
