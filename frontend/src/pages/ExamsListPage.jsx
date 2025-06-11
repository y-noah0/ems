import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import examService from '../services/examService';

const ExamsListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Get status from URL query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const status = queryParams.get('status');
    if (status) {
      setFilterStatus(status);
    }
  }, [location.search]);

  // Fetch exams data
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
  
  // Filter exams based on status and search term
  const filteredExams = exams.filter(exam => {
    const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subject?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });
  
  // Sort exams: draft first, then active, scheduled, and finally completed
  const statusOrder = { 'draft': 0, 'scheduled': 1, 'active': 2, 'completed': 3 };
  const sortedExams = [...filteredExams].sort((a, b) => {
    // First sort by status
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // Then sort by created date (newest first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <p className="mt-1 text-gray-600">
          Manage your exams
        </p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
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
      ) : sortedExams.length === 0 ? (
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-xl font-medium text-gray-900 mb-2">No exams found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try changing your search criteria' 
                : 'Create your first exam to get started'}
            </p>
            <Button as={Link} to="/teacher/exams/create">
              Create New Exam
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedExams.map(exam => (
            <Card key={exam._id}>
              <div className="p-4">
                <div className="flex flex-wrap justify-between">
                  <div className="mb-2">
                    <h3 className="text-lg font-medium">{exam.title}</h3>
                    <p className="text-gray-600 text-sm">
                      {exam.subject?.name} • {exam.class ? `${exam.class?.level}${exam.class?.trade}` : 'No class assigned'}
                    </p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      exam.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      exam.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      exam.status === 'active' ? 'bg-green-100 text-green-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 flex flex-wrap items-center text-sm text-gray-600">
                  <div className="mr-6 mb-2">
                    <span className="font-medium">Questions:</span> {exam.questions?.length || 0}
                  </div>
                  <div className="mr-6 mb-2">
                    <span className="font-medium">Points:</span> {exam.totalPoints || 0}
                  </div>
                  
                  {exam.status === 'scheduled' && (
                    <div className="mr-6 mb-2">
                      <span className="font-medium">Scheduled:</span> {new Date(exam.schedule?.start).toLocaleString()}
                    </div>
                  )}
                  
                  {exam.status === 'active' && (
                    <div className="mr-6 mb-2">
                      <span className="font-medium">Started:</span> {new Date(exam.schedule?.start).toLocaleString()}
                    </div>
                  )}
                  
                  {exam.status === 'completed' && (
                    <div className="mr-6 mb-2">
                      <span className="font-medium">Completed:</span> {new Date(exam.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    as={Link}
                    to={`/teacher/exams/${exam._id}`}
                    variant="primary"
                    size="sm"
                  >
                    View
                  </Button>
                  
                  {exam.status === 'draft' && (
                    <>
                      <Button
                        as={Link}
                        to={`/teacher/exams/${exam._id}/edit`}
                        variant="secondary"
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
                    </>
                  )}
                  
                  {exam.status === 'scheduled' && (
                    <Button
                      onClick={() => examService.activateExam(exam._id)
                        .then(() => {
                          // Refresh exams
                          examService.getTeacherExams().then(setExams);
                        })
                      }
                      variant="success"
                      size="sm"
                    >
                      Activate
                    </Button>
                  )}
                  
                  {exam.status === 'active' && (
                    <>
                      <Button
                        as={Link}
                        to={`/teacher/exams/${exam._id}/results`}
                        variant="secondary"
                        size="sm"
                      >
                        View Results
                      </Button>
                      <Button
                        onClick={() => examService.completeExam(exam._id)
                          .then(() => {
                            // Refresh exams
                            examService.getTeacherExams().then(setExams);
                          })
                        }
                        variant="warning"
                        size="sm"
                      >
                        Complete Exam
                      </Button>
                    </>
                  )}
                  
                  {exam.status === 'completed' && (
                    <Button
                      as={Link}
                      to={`/teacher/exams/${exam._id}/results`}
                      variant="secondary"
                      size="sm"
                    >
                      View Results
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default ExamsListPage;
