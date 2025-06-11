import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import adminService from '../services/adminService';
import submissionService from '../services/submissionService';
import { useAuth } from '../context/AuthContext';

const StudentResults = () => {
  const { currentUser } = useAuth();
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');  useEffect(() => {
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
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const averageScore = results.length > 0 ? (totalScore / results.length).toFixed(2) : 0;
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title/Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>  
            <tbody className="bg-white divide-y divide-gray-200">              {results.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    No results available
                  </td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr key={result._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.title} <span className="text-xs bg-gray-100 px-2 py-1 rounded">{result.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <span className={`font-medium ${result.score >= 70 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {result.score}
                        </span>
                        <span className="text-gray-500 ml-1">/ {result.maxScore}</span>
                        <div className="ml-4 w-16 bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${result.score >= 70 ? 'bg-green-500' : result.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${(result.score / result.maxScore) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(result.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  )
};

export default StudentResults;
