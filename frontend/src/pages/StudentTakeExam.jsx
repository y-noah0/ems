import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ExamContent from '../components/exam/ExamContent';
import ExamSidebar from '../components/exam/ExamSidebar';
import BackButton from '../components/exam/BackButton';
import examService from '../services/examService';

const StudentTakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const exam = await examService.getExamById(examId);
        
        // Transform the exam data to match what ExamSidebar expects
        const transformedExamData = {
          ...exam,
          description: exam.instructions || 'No description available',
          startTime: exam.schedule?.start ? new Date(exam.schedule.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD',
          endTime: exam.schedule?.start && exam.schedule?.duration ? 
            new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD',
          totalQuestions: exam.questions?.length || 0,
          totalMarks: exam.questions?.reduce((sum, q) => sum + (q.maxScore || 0), 0) || exam.totalScore || 0,
          progress: currentProgress,
          courseCode: exam.classes?.[0]?.name || exam.subject?.name || 'N/A',
          status: exam.status || 'active'
        };
        
        setExamData(transformedExamData);
        setQuestions(exam.questions || []);
      } catch (error) {
        console.error('Error fetching exam data:', error);
        // Handle error appropriately
      }
    };

    if (examId) {
      fetchExamData();
    }
  }, [examId, currentProgress]);

  const handleSubmitExam = () => {
    // Student exam submission logic
    const confirmed = window.confirm('Are you sure you want to submit your exam? This action cannot be undone.');
    if (confirmed) {
      console.log('Submitting exam...');
      // You can add actual submission logic here
      alert('Exam submitted successfully!');
      navigate('/student/exams');
    }
  };

  const handleSaveProgress = () => {
    // Student progress saving logic
    console.log('Saving progress...');
    // Simulate progress update
    setCurrentProgress(prev => Math.min(prev + 10, 100));
    alert('Progress saved successfully!');
  };

  if (!examData) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with Back Button */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Take Exam</h1>
            </div>
            <BackButton />
          </div>

          {/* Content Area - Student can interact with exam */}
          <div className="flex-1 min-h-0">
            <ExamContent questions={questions} userRole="student" />
          </div>
        </div>

        {/* Sidebar - Student can save progress and submit */}
        <div className="lg:flex-shrink-0 order-first lg:order-last">
          <ExamSidebar
            examData={examData}
            userRole="student"
            onSubmitExam={handleSubmitExam}
            onSaveProgress={handleSaveProgress}
          />
        </div>
      </div>
    </Layout>
  );
};

export default StudentTakeExam;
