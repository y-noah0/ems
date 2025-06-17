import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService';

// Component to display submission statistics
const SubmissionStats = ({ submissions, exam }) => {
  // Calculate statistics
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.status === 'graded').length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
  
  // Calculate average score from graded submissions
  const averageScore = gradedSubmissions > 0 
    ? Math.round(
        submissions
          .filter(s => s.status === 'graded')
          .reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions
      )
    : 0;
    
  // Calculate highest and lowest scores
  const scores = submissions
    .filter(s => s.status === 'graded')
    .map(s => s.score || 0);
    
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  
  // Calculate grade distribution (A, B, C, D, F)
  const gradeDistribution = submissions
    .filter(s => s.status === 'graded')
    .reduce((acc, s) => {
      const percentage = ((s.score || 0) / (exam?.totalPoints || 100)) * 100;
      if (percentage >= 90) acc.A += 1;
      else if (percentage >= 80) acc.B += 1;
      else if (percentage >= 70) acc.C += 1;
      else if (percentage >= 60) acc.D += 1;
      else acc.F += 1;
      return acc;
    }, { A: 0, B: 0, C: 0, D: 0, F: 0 });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
        <h3 className="text-lg font-medium text-gray-700">Submissions</h3>
        <div className="mt-2">
          <p className="text-3xl font-bold text-gray-800">{totalSubmissions}</p>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-green-600">{gradedSubmissions} Graded</span>
            <span className="text-yellow-600">{pendingSubmissions} Pending</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
        <h3 className="text-lg font-medium text-gray-700">Average Score</h3>
        <div className="mt-2">
          <p className="text-3xl font-bold text-gray-800">{averageScore}/{exam?.totalPoints || 100}</p>
          <p className="text-sm text-gray-600 mt-2">
            {averageScore ? `${Math.round((averageScore / (exam?.totalPoints || 100)) * 100)}%` : 'No scores yet'}
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
        <h3 className="text-lg font-medium text-gray-700">Highest / Lowest</h3>
        <div className="flex justify-between mt-2">
          <div>
            <p className="text-xl font-bold text-gray-800">{highestScore}</p>
            <p className="text-xs text-gray-500">Max</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{lowestScore}</p>
            <p className="text-xs text-gray-500">Min</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
        <h3 className="text-lg font-medium text-gray-700">Grade Distribution</h3>
        <div className="flex justify-between mt-2 text-sm">
          {Object.entries(gradeDistribution).map(([grade, count]) => (
            <div key={grade} className="text-center">
              <p className="font-bold">{grade}</p>
              <p>{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ExamResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        // Fetch exam details
        const examData = await examService.getExamById(examId);
        setExam(examData);
        
        // Fetch submissions for this exam
        const submissionsData = await examService.getExamSubmissions(examId);
        setSubmissions(submissionsData);
        setFilteredSubmissions(submissionsData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching exam results:', err);
        setError('Failed to load exam results. Please try again.');
        setLoading(false);
      }
    };

    fetchExamData();
  }, [examId]);

  // Filter submissions based on search term and status filter
  useEffect(() => {
    if (!submissions.length) return;
    
    let filtered = [...submissions];
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(submission => submission.status === statusFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(submission => 
        submission.student?.firstName?.toLowerCase().includes(term) || 
        submission.student?.lastName?.toLowerCase().includes(term) || 
        submission.student?.registrationNumber?.toLowerCase().includes(term)
      );
    }
    
    setFilteredSubmissions(filtered);
  }, [submissions, searchTerm, statusFilter]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Card className="mx-auto my-8 max-w-4xl">
          <div className="p-6 text-center">
            <div className="text-red-500 text-xl mb-4">
              {error}
            </div>
            <Button onClick={() => navigate('/teacher/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <Card className="mx-auto my-8 max-w-4xl">
          <div className="p-6 text-center">
            <div className="text-xl mb-4">
              Exam not found
            </div>
            <Button onClick={() => navigate('/teacher/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Exam Results: {exam.title}
          </h1>
          <Button onClick={() => navigate('/teacher/dashboard')}>
            Back to Dashboard
          </Button>
        </div>        <Card className="mb-6">
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Exam Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Subject:</span> {exam.subject?.name || 'N/A'}</p>
                <p><span className="font-medium">Duration:</span> {exam.duration} minutes</p>
              </div>
              <div>
                <p><span className="font-medium">Total Questions:</span> {exam.questions?.length || 0}</p>
                <p><span className="font-medium">Maximum Score:</span> {exam.totalPoints || '100'}</p>
              </div>
            </div>
          </div>
        </Card>        {/* Submission Statistics */}
        <Card className="mb-6">
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Exam Statistics</h2>
            <SubmissionStats submissions={submissions} exam={exam} />
          </div>
        </Card>
        
        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 mb-4 md:mb-0 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by student name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <select
              className="w-full md:w-auto px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Submissions</option>
              <option value="graded">Graded</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div className="text-gray-600">
            {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'result' : 'results'}
          </div>        </div>

        <Card>
          <div className="p-4">            <h2 className="text-xl font-semibold mb-4">Student Submissions ({submissions.length})</h2>
            
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No submissions for this exam yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submission Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSubmissions.map((submission) => (
                      <tr key={submission._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.student?.fullName || `${submission.student?.firstName || ''} ${submission.student?.lastName || ''}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.student?.registrationNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.status === 'graded' 
                            ? `${submission.score || 0} / ${exam.totalPoints || 100}` 
                            : 'Pending'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.status === 'graded' 
                            ? `${Math.round(((submission.score || 0) / (exam.totalPoints || 100)) * 100)}%`
                            : 'Pending'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            onClick={() => navigate(`/teacher/submissions/${submission._id}/view`)}
                            className="text-sm"
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default ExamResults;
