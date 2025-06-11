import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService';

const ExamView = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        const examData = await examService.getExamById(examId);
        setExam(examData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching exam:', err);
        setError('Failed to load exam data. Please try again.');
        setLoading(false);
      }
    };

    fetchExamData();
  }, [examId]);

  const handleActivateExam = async () => {
    try {
      await examService.activateExam(examId);
      // Refresh the exam data
      const updatedExam = await examService.getExamById(examId);
      setExam(updatedExam);
    } catch (err) {
      console.error('Error activating exam:', err);
      setError('Failed to activate exam. Please try again.');
    }
  };

  const handleCompleteExam = async () => {
    try {
      await examService.completeExam(examId);
      // Refresh the exam data
      const updatedExam = await examService.getExamById(examId);
      setExam(updatedExam);
    } catch (err) {
      console.error('Error completing exam:', err);
      setError('Failed to complete exam. Please try again.');
    }
  };

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
        <Card className="mx-auto my-8 max-w-2xl">
          <div className="p-6 text-center">
            <div className="text-red-500 text-xl mb-4">{error}</div>
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
        <Card className="mx-auto my-8 max-w-2xl">
          <div className="p-6 text-center">
            <div className="text-xl mb-4">Exam not found</div>
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
          <div>
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <p className="text-gray-600">
              Status: <span className="font-medium capitalize">{exam.status}</span>
            </p>
          </div>
          <Button onClick={() => navigate('/teacher/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">Exam Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><span className="font-medium">Subject:</span> {exam.subject?.name}</p>
                    <p><span className="font-medium">Class:</span> {exam.class?.name || `${exam.class?.level}${exam.class?.trade}`}</p>
                    <p><span className="font-medium">Type:</span> {exam.type}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Questions:</span> {exam.questions?.length || 0}</p>
                    <p><span className="font-medium">Total Points:</span> {exam.totalPoints}</p>
                    <p><span className="font-medium">Created:</span> {new Date(exam.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </Card>

            {exam.schedule && (
              <Card className="mb-6">
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">Schedule</h2>
                  <div>
                    <p>
                      <span className="font-medium">Start Date:</span>{" "}
                      {new Date(exam.schedule.start).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Duration:</span>{" "}
                      {exam.schedule.duration} minutes
                    </p>
                    <p>
                      <span className="font-medium">End Date:</span>{" "}
                      {new Date(
                        new Date(exam.schedule.start).getTime() +
                          exam.schedule.duration * 60000
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">Questions</h2>
                  <Button
                    onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
                    variant="secondary"
                    size="sm"
                  >
                    Edit Questions
                  </Button>
                </div>

                {exam.questions?.length === 0 ? (
                  <p className="text-gray-500">No questions added to this exam yet.</p>
                ) : (
                  <div className="space-y-4">
                    {exam.questions?.map((question, index) => (
                      <div key={question._id || index} className="border rounded-md p-3">
                        <div className="flex justify-between">
                          <h3 className="font-medium">Question {index + 1}</h3>
                          <span className="text-gray-500">{question.points} pts</span>
                        </div>
                        <p className="text-gray-800 mt-1">{question.text}</p>
                        
                        {question.type === 'multiple-choice' && question.options?.length > 0 && (
                          <div className="mt-2">
                            <ul className="space-y-1">
                              {question.options.map((option, optIdx) => (
                                <li key={optIdx} className={`pl-2 ${option.isCorrect ? 'text-green-600 font-medium' : ''}`}>
                                  {option.text} {option.isCorrect && '✓'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div>
            <Card>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-4">Actions</h2>
                <div className="space-y-3">
                  {exam.status === 'draft' && (
                    <>
                      <Button
                        onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
                        className="w-full justify-center"
                      >
                        Edit Exam
                      </Button>
                      <Button
                        onClick={() => navigate(`/teacher/exams/${examId}/schedule`)}
                        className="w-full justify-center"
                        variant="secondary"
                      >
                        Schedule Exam
                      </Button>
                    </>
                  )}

                  {exam.status === 'scheduled' && (
                    <>
                      <Button
                        onClick={handleActivateExam}
                        className="w-full justify-center bg-green-600 hover:bg-green-700"
                      >
                        Activate Exam
                      </Button>
                      <Button
                        onClick={() => navigate(`/teacher/exams/${examId}/schedule`)}
                        className="w-full justify-center"
                        variant="secondary"
                      >
                        Change Schedule
                      </Button>
                    </>
                  )}

                  {exam.status === 'active' && (
                    <>
                      <Button
                        onClick={handleCompleteExam}
                        className="w-full justify-center bg-amber-600 hover:bg-amber-700"
                      >
                        Complete Exam
                      </Button>
                      <Button
                        onClick={() => navigate(`/teacher/exams/${examId}/results`)}
                        className="w-full justify-center"
                        variant="secondary"
                      >
                        View Results (Live)
                      </Button>
                    </>
                  )}

                  {exam.status === 'completed' && (
                    <Button
                      onClick={() => navigate(`/teacher/exams/${examId}/results`)}
                      className="w-full justify-center"
                      variant="primary"
                    >
                      View & Grade Results
                    </Button>
                  )}

                  <div className="border-t pt-3 mt-3">
                    <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this exam?')) {
                          examService.deleteExam(examId).then(() => {
                            navigate('/teacher/dashboard');
                          });
                        }
                      }}
                      className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
                      variant="link"
                    >
                      Delete Exam
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExamView;
