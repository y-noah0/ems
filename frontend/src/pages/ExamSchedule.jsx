import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import examService from '../services/examService';

const ExamSchedule = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Schedule form state
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        const examData = await examService.getExamById(examId);
        setExam(examData);
        
        // Set default duration if available
        if (examData?.duration) {
          setDuration(examData.duration);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching exam:', err);
        setError('Failed to load exam data. Please try again.');
        setLoading(false);
      }
    };

    fetchExamData();
  }, [examId]);
  
  const handleScheduleExam = async (e) => {
    e.preventDefault();
    
    if (!startDate || !startTime || !duration) {
      setScheduleError('Please fill all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      setScheduleError(null);
      
      // Combine date and time for API
      const startDateTime = new Date(`${startDate}T${startTime}`);
      
      await examService.scheduleExam(examId, {
        start: startDateTime.toISOString(),
        duration: parseInt(duration)
      });
      
      // Redirect to exam details
      navigate(`/teacher/exams/${examId}`);
    } catch (err) {
      console.error('Error scheduling exam:', err);
      setScheduleError('Failed to schedule exam. Please try again.');
      setSubmitting(false);
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Schedule Exam</h1>
          <Button onClick={() => navigate('/teacher/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
        
        <Card className="mb-6">
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Exam Information</h2>
            <div className="mb-4">
              <p><span className="font-medium">Title:</span> {exam?.title}</p>
              <p><span className="font-medium">Subject:</span> {exam?.subject?.name}</p>
              <p><span className="font-medium">Class:</span> {exam?.class?.name || `${exam?.class?.level}${exam?.class?.trade}`}</p>
              <p><span className="font-medium">Questions:</span> {exam?.questions?.length || 0}</p>
              <p><span className="font-medium">Total Points:</span> {exam?.totalPoints || 'N/A'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <form onSubmit={handleScheduleExam} className="p-4">
            <h2 className="text-xl font-semibold mb-4">Schedule Details</h2>
            
            {scheduleError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {scheduleError}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date*
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time*
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)*
              </label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                min="1"
                max="240"
              />
              <div className="text-xs text-gray-500 mt-1">
                Recommended duration: 1-2 minutes per question
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? 'Scheduling...' : 'Schedule Exam'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default ExamSchedule;
