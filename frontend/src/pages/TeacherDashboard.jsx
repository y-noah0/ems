import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import examService from '../services/examService';
import ExamCard from '../components/ui/ExamCard';

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
                  <ExamCard 
                    key={exam._id}
                    examId={exam._id}
                    title={exam.title}
                    subject={exam.subject.name}
                    classCode={
                      Array.isArray(exam.classes) && exam.classes.length > 0
                        ? exam.classes.map(cls => `${cls.level}${cls.trade}`).join(', ')
                        : 'No class assigned'
                    }
                    description={`${exam.type.toUpperCase()} - Draft`}
                    status="upcoming"
                    startTime="Not scheduled"
                    endTime="Not scheduled"
                    questions={exam.questions?.length || 0}
                    totalPoints={exam.totalPoints || 0}
                    userRole="teacher"
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
                    subject={exam.subject.name}
                    classCode={
                      Array.isArray(exam.classes) && exam.classes.length > 0
                        ? exam.classes.map(cls => `${cls.level}${cls.trade}`).join(', ')
                        : 'No class assigned'
                    }
                    description={exam.description || `Scheduled exam: ${exam.title}`}
                    status="upcoming"
                    startTime={new Date(exam.schedule.start).toLocaleString()}
                    endTime={new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000).toLocaleString()}
                    questions={exam.questions?.length || 0}
                    totalPoints={exam.totalPoints || 0}
                    userRole="teacher"
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
                    subject={exam.subject.name}
                    classCode={
                      Array.isArray(exam.classes) && exam.classes.length > 0
                        ? exam.classes.map(cls => `${cls.level}${cls.trade}`).join(', ')
                        : 'No class assigned'
                    }
                    description={exam.description || `Active exam: ${exam.title}`}
                    status="active"
                    startTime={new Date(exam.schedule.start).toLocaleString()}
                    endTime={new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000).toLocaleString()}
                    questions={exam.questions?.length || 0}
                    totalPoints={exam.totalPoints || 0}
                    progress={50}
                    userRole="teacher"
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
                    subject={exam.subject.name}
                    classCode={
                      Array.isArray(exam.classes) && exam.classes.length > 0
                        ? exam.classes.map(cls => `${cls.level}${cls.trade}`).join(', ')
                        : 'No class assigned'
                    }
                    description={exam.description || `Completed on ${new Date(exam.updatedAt).toLocaleDateString()}`}
                    status="completed"
                    startTime={exam.schedule?.start ? new Date(exam.schedule.start).toLocaleString() : "N/A"}
                    endTime={exam.schedule?.start && exam.schedule?.duration ? 
                      new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000).toLocaleString() : "N/A"}
                    questions={exam.questions?.length || 0}
                    totalPoints={exam.totalPoints || 0}
                    progress={100}
                    userRole="teacher"
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
