import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import DynamicTable from '../components/class/DynamicTable';
import adminService from '../services/adminService';
import submissionService from '../services/submissionService';
import { useAuth } from '../context/AuthContext';

const StudentResults = () => {
  const { currentUser } = useAuth();
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentResults = async () => {
      setLoading(true);
      try {
        const isStudent = currentUser?.role === 'student';
        const isViewingOwnResults = isStudent && !studentId;
        
        // Different approach based on user role and scenario
        if (isViewingOwnResults) {
          // Student viewing their own results - use student data from auth context
          setStudent(currentUser);
          
          // Get results using submissionService (proper student route)
          const submissionsData = await submissionService.getStudentSubmissions();
          
          // Transform the submissions to match the expected results format
          const formattedResults = submissionsData.map(sub => ({
            _id: sub._id,
            subject: sub.exam?.subject?.name || 'Unknown',
            title: sub.exam?.title || 'Unknown',
            type: sub.exam?.type || 'Unknown',
            score: sub.score || 0,
            maxScore: sub.totalPoints || sub.exam?.totalPoints || 100,
            date: sub.submittedAt || sub.startTime
          }));
          
          setResults(formattedResults);
        } else {
          // Admin/Dean viewing student results - use admin routes
          // Determine which student ID to use
          const targetStudentId = studentId || (isStudent ? currentUser._id : null);
          
          if (!targetStudentId) {
            throw new Error('No student ID available');
          }
          
          // Get student data
          const studentData = await adminService.getStudentById(targetStudentId);
          setStudent(studentData);
          
          // Get results
          const resultsData = await adminService.getStudentResults(targetStudentId);
          setResults(resultsData);
        }
      } catch (error) {
        console.error('Error fetching student results:', error);
        setError('Failed to load student results: ' + (error.message || ''));
      } finally {
        setLoading(false);
      }
    };

    fetchStudentResults();
  }, [studentId, currentUser]);

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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          Student data could not be loaded. Please try again later.
        </div>
      </Layout>
    );
  }

  // Calculate average score
  const totalScore = results.reduce((sum, result) => {
    // Calculate percentage score for each result
    const scoreValue = typeof result.score === 'number' ? result.score : 0;
    const maxScoreValue = result.maxScore || 100;
    const percentage = (scoreValue / maxScoreValue) * 100;
    return sum + percentage;
  }, 0);
  const averageScore = results.length > 0 ? (totalScore / results.length).toFixed(2) : 0;

  // Results table columns
  const resultsColumns = [
    { 
      key: 'subject', 
      title: 'Subject',
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {value}
        </span>
      )
    },
    { 
      key: 'title', 
      title: 'Exam Title',
      render: (value) => (
        <span className="text-sm text-gray-900">
          {value}
        </span>
      )
    },
    { 
      key: 'type', 
      title: 'Type',
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value?.toUpperCase() || 'EXAM'}
        </span>
      )
    },
    { 
      key: 'score', 
      title: 'Score',
      render: (value, item) => (
        <span className="text-sm font-medium text-gray-900">
          {value || 0} / {item.maxScore || 100}
        </span>
      )
    },
    { 
      key: 'percentage', 
      title: 'Percentage',
      render: (value, item) => {
        const percentage = ((item.score || 0) / (item.maxScore || 100)) * 100;
        const colorClass = percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600';
        return (
          <span className={`text-sm font-medium ${colorClass}`}>
            {percentage.toFixed(1)}%
          </span>
        );
      }
    },
    { 
      key: 'date', 
      title: 'Date',
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      )
    }
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Results</h1>
        <p className="mt-1 text-gray-600">{student.fullName || `${student.firstName} ${student.lastName}`} - {student.registrationNumber}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-center">
            <h2 className="text-gray-600 text-sm font-medium">Average Score</h2>
            <p className="text-3xl font-semibold text-gray-800">{averageScore}%</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-center">
            <h2 className="text-gray-600 text-sm font-medium">Exams Taken</h2>
            <p className="text-3xl font-semibold text-gray-800">{results.length}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-center">
            <h2 className="text-gray-600 text-sm font-medium">Highest Score</h2>
            <p className="text-3xl font-semibold text-gray-800">
              {results.length > 0 ? Math.max(...results.map(r => r.score)) : '–'}%
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-center">
            <h2 className="text-gray-600 text-sm font-medium">Lowest Score</h2>
            <p className="text-3xl font-semibold text-gray-800">
              {results.length > 0 ? Math.min(...results.map(r => r.score)) : '–'}%
            </p>
          </div>
        </div>
      </div>

      <Card title="Exam Results">
        <div className="overflow-x-auto">
          <DynamicTable
            data={results}
            columns={resultsColumns}
            emptyMessage="No results available"
          />
        </div>
      </Card>
    </Layout>
  )
};

export default StudentResults;
