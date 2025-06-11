import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import examService from '../services/examService';

const SubmissionsListPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  // Fetch exams and submissions data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch teacher's exams
        const examsData = await examService.getTeacherExams();
        setExams(examsData);
        
        try {
          // Fetch teacher's submissions
          const submissionsData = await examService.getTeacherSubmissions();
          setSubmissions(submissionsData);
        } catch (submissionError) {
          console.error('Error fetching submissions:', submissionError);
          setError('Failed to load submissions: ' + (submissionError.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error fetching exams:', error);
        setError('Failed to load exams and submissions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Filter submissions based on search term and selected exam
  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = searchTerm === '' || 
      submission.exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesExam = selectedExam === 'all' || submission.exam._id === selectedExam;
    
    return matchesSearch && matchesExam;
  });
  
  // Group submissions by exam
  const groupedSubmissions = filteredSubmissions.reduce((acc, submission) => {
    const examId = submission.exam._id;
    if (!acc[examId]) {
      acc[examId] = {
        exam: submission.exam,
        submissions: []
      };
    }
    acc[examId].submissions.push(submission);
    return acc;
  }, {});
  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Submissions</h1>
        <p className="mt-1 text-gray-600">
          View and grade student exam submissions
        </p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-64">
          <Input
            type="text"
            placeholder="Search submissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            <option value="all">All Exams</option>
            {exams.map(exam => (
              <option key={exam._id} value={exam._id}>
                {exam.title}
              </option>
            ))}
          </select>
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
      ) : Object.keys(groupedSubmissions).length === 0 ? (
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-xl font-medium text-gray-900 mb-2">No submissions found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedExam !== 'all'
                ? 'Try changing your search criteria' 
                : 'There are no student submissions yet'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSubmissions).map(([examId, { exam, submissions }]) => (
            <div key={examId} className="border rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="font-semibold text-lg">{exam.title}</h2>
                    <p className="text-gray-600 text-sm">
                      {exam.subject?.name} • Class: {exam.class?.level}{exam.class?.trade}
                    </p>
                  </div>
                  <Button
                    as={Link}
                    to={`/teacher/exams/${examId}/results`}
                    variant="secondary"
                    size="sm"
                  >
                    View All Results
                  </Button>
                </div>
                
                <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                  <p>Total Submissions: {submissions.length}</p>
                  <p>Pending: {submissions.filter(s => s.status === 'pending').length}</p>
                  <p>Graded: {submissions.filter(s => s.status === 'graded').length}</p>
                </div>
              </div>
              
              <div className="divide-y">
                {submissions.map((submission) => (
                  <div key={submission._id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          {submission.student.firstName} {submission.student.lastName}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {submission.student.registrationNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        {submission.status === 'pending' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending Review
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Graded
                            </span>
                            <p className="text-sm font-medium mt-1">
                              {submission.score}/{submission.totalPoints} ({Math.round((submission.score / submission.totalPoints) * 100)}%)
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                      <Button
                        onClick={() => navigate(`/teacher/submissions/${submission._id}/view`)}
                        variant={submission.status === 'pending' ? "primary" : "secondary"}
                        size="sm"
                      >
                        {submission.status === 'pending' ? 'Review & Grade' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default SubmissionsListPage;
