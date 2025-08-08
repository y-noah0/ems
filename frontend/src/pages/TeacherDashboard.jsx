import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ExamCard from '../components/ui/ExamCard';
import examService from '../services/examService';

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      if (!currentUser?.school) {
        toast.error('No school associated with your account. Please log in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const examsData = await examService.getTeacherExams(currentUser.school);
        setExams(Array.isArray(examsData) ? examsData : []);
      } catch (error) {
        console.error('Error fetching exams:', error);
        toast.error(error.message || 'Failed to load exams');
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [currentUser]);

  const handleActivateExam = async (examId) => {
    if (!currentUser?.school) {
      toast.error('No school associated with your account.');
      return;
    }

    setLoading(true);
    try {
      const updatedExam = await examService.activateExam(examId, currentUser.school);
      setExams(exams.map(exam => (exam._id === examId ? updatedExam : exam)));
      toast.success('Exam activated successfully!');
    } catch (error) {
      console.error('Error activating exam:', error);
      toast.error(error.message || 'Failed to activate exam');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteExam = async (examId) => {
    if (!currentUser?.school) {
      toast.error('No school associated with your account.');
      return;
    }

    setLoading(true);
    try {
      const updatedExam = await examService.completeExam(examId, currentUser.school);
      setExams(exams.map(exam => (exam._id === examId ? updatedExam : exam)));
      toast.success('Exam completed successfully!');
    } catch (error) {
      console.error('Error completing exam:', error);
      toast.error(error.message || 'Failed to complete exam');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleExam = async (examId, scheduleData) => {
    if (!currentUser?.school) {
      toast.error('No school associated with your account.');
      return;
    }

    setLoading(true);
    try {
      const updatedExam = await examService.scheduleExam(examId, scheduleData, currentUser.school);
      setExams(exams.map(exam => (exam._id === examId ? updatedExam : exam)));
      toast.success('Exam scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling exam:', error);
      toast.error(error.message || 'Failed to schedule exam');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!currentUser?.school) {
      toast.error('No school associated with your account.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this exam?')) {
      return;
    }

    setLoading(true);
    try {
      await examService.deleteExam(examId, currentUser.school);
      setExams(exams.filter(exam => exam._id !== examId));
      toast.success('Exam deleted successfully!');
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error(error.message || 'Failed to delete exam');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totalPoints dynamically
  const calculateTotalPoints = (questions) => {
    return questions?.reduce((sum, q) => sum + (parseInt(q.maxScore) || 0), 0) || 0;
  };

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
          Welcome back, {currentUser?.fullName || 'Teacher'}
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Your Exams</h2>
        <Button as={Link} to="/teacher/exams/create" variant="primary">
          Create New Exam
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                  <ExamCard
                    key={exam._id}
                    examId={exam._id}
                    title={exam.title}
                    subject={exam.subject?.name || 'Unknown Subject'}
                    classCode={
                      Array.isArray(exam.classes) && exam.classes.length > 0
                        ? exam.classes.map(cls => cls.className || `${cls.level}${cls.trade?.code || ''}`).join(', ')
                        : 'No class assigned'
                    }
                    description={`${exam.type.charAt(0).toUpperCase() + exam.type.slice(1)} - Draft`}
                    status="upcoming"
                    startTime="Not scheduled"
                    endTime="Not scheduled"
                    questions={exam.questions?.length || 0}
                    totalPoints={calculateTotalPoints(exam.questions)}
                    userRole="teacher"
                    actions={[
                      {
                        label: 'Schedule',
                        onClick: () => {
                          const startTime = prompt('Enter start time (YYYY-MM-DDTHH:MM):');
                          const duration = prompt('Enter duration (minutes):');
                          if (startTime && duration) {
                            const scheduleData = {
                              start: new Date(startTime).toISOString(),
                              duration: parseInt(duration)
                            };
                            if (new Date(scheduleData.start) <= new Date()) {
                              toast.error('Start time must be in the future');
                              return;
                            }
                            if (scheduleData.duration < 5) {
                              toast.error('Duration must be at least 5 minutes');
                              return;
                            }
                            handleScheduleExam(exam._id, scheduleData);
                          }
                        }
                      },
                      {
                        label: 'Edit',
                        onClick: () => navigate(`/teacher/exams/${exam._id}/edit`)
                      },
                      {
                        label: 'Delete',
                        onClick: () => handleDeleteExam(exam._id),
                        variant: 'danger'
                      }
                    ]}
                  />
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
                  <ExamCard
                    key={exam._id}
                    examId={exam._id}
                    title={exam.title}
                    subject={exam.subject?.name || 'Unknown Subject'}
                    classCode={
                      Array.isArray(exam.classes) && exam.classes.length > 0
                        ? exam.classes.map(cls => cls.className || `${cls.level}${cls.trade?.code || ''}`).join(', ')
                        : 'No class assigned'
                    }
                    description={exam.instructions || `Scheduled exam: ${exam.title}`}
                    status="upcoming"
                    startTime={exam.schedule?.start ? new Date(exam.schedule.start).toLocaleString() : 'N/A'}
                    endTime={
                      exam.schedule?.start && exam.schedule?.duration
                        ? new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000).toLocaleString()
                        : 'N/A'
                    }
                    questions={exam.questions?.length || 0}
                    totalPoints={calculateTotalPoints(exam.questions)}
                    userRole="teacher"
                    actions={[
                      {
                        label: 'Activate',
                        onClick: () => handleActivateExam(exam._id)
                      },
                      {
                        label: 'Edit',
                        onClick: () => navigate(`/teacher/exams/${exam._id}/edit`)
                      },
                      {
                        label: 'Delete',
                        onClick: () => handleDeleteExam(exam._id),
                        variant: 'danger'
                      }
                    ]}
                  />
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
                  <ExamCard
                    key={exam._id}
                    examId={exam._id}
                    title={exam.title}
                    subject={exam.subject?.name || 'Unknown Subject'}
                    classCode={
                      Array.isArray(exam.classes) && exam.classes.length > 0
                        ? exam.classes.map(cls => cls.className || `${cls.level}${cls.trade?.code || ''}`).join(', ')
                        : 'No class assigned'
                    }
                    description={exam.instructions || `Active exam: ${exam.title}`}
                    status="active"
                    startTime={exam.schedule?.start ? new Date(exam.schedule.start).toLocaleString() : 'N/A'}
                    endTime={
                      exam.schedule?.start && exam.schedule?.duration
                        ? new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000).toLocaleString()
                        : 'N/A'
                    }
                    questions={exam.questions?.length || 0}
                    totalPoints={calculateTotalPoints(exam.questions)}
                    userRole="teacher"
                    actions={[
                      {
                        label: 'Complete',
                        onClick: () => handleCompleteExam(exam._id)
                      },
                      {
                        label: 'View Submissions',
                        onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`)
                      }
                    ]}
                  />
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
                  <ExamCard
                    key={exam._id}
                    examId={exam._id}
                    title={exam.title}
                    subject={exam.subject?.name || 'Unknown Subject'}
                    classCode={
                      Array.isArray(exam.classes) && exam.classes.length > 0
                        ? exam.classes.map(cls => cls.className || `${cls.level}${cls.trade?.code || ''}`).join(', ')
                        : 'No class assigned'
                    }
                    description={exam.instructions || `Completed on ${new Date(exam.updatedAt).toLocaleDateString()}`}
                    status="completed"
                    startTime={exam.schedule?.start ? new Date(exam.schedule.start).toLocaleString() : 'N/A'}
                    endTime={
                      exam.schedule?.start && exam.schedule?.duration
                        ? new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000).toLocaleString()
                        : 'N/A'
                    }
                    questions={exam.questions?.length || 0}
                    totalPoints={calculateTotalPoints(exam.questions)}
                    userRole="teacher"
                    actions={[
                      {
                        label: 'View Submissions',
                        onClick: () => navigate(`/teacher/exams/${exam._id}/submissions`)
                      },
                      {
                        label: 'Delete',
                        onClick: () => handleDeleteExam(exam._id),
                        variant: 'danger'
                      }
                    ]}
                  />
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