import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ExamTabs from '../components/exam/ExamTabs';
import ExamContent from '../components/exam/ExamContent';
import SubmissionsContent from '../components/exam/SubmissionsContent';
import ExamSidebar from '../components/exam/ExamSidebar';
import BackButton from '../components/exam/BackButton';
import examService from '../services/examService';

const ExamDetails = () => {
  const { examId } = useParams();
  const [activeTab, setActiveTab] = useState('exam');
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Determine user role - this should be replaced with actual authentication logic
  const getUserRole = () => {
    // For now, we'll determine role based on current URL path
    const currentPath = window.location.pathname;
    if (currentPath.includes('/dean/')) {
      return 'dean';
    } else if (currentPath.includes('/student/')) {
      return 'student';
    } else if (currentPath.includes('/teacher/')) {
      return 'teacher';
    }
    
    // Default to teacher for backward compatibility
    return 'teacher';
  };

  const userRole = getUserRole();

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
          progress: userRole === 'student' ? 0 : 75, // Students start at 0, others show mock progress
          courseCode: exam.classes?.[0]?.name || exam.subject?.name || 'N/A',
          status: exam.status || 'draft'
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
  }, [examId, userRole]);

  const handleApprove = () => {
    setApprovalStatus('approved');
  };

  const handleReject = () => {
    setApprovalStatus('rejected');
  };

  const handleRevokeApproval = () => {
    setApprovalStatus('pending');
  };

  const handleResetStatus = () => {
    setApprovalStatus('pending');
  };

  const handleSubmitExam = () => {
    // Student exam submission logic
    console.log('Submitting exam...');
    // You can add actual submission logic here
    alert('Exam submitted successfully!');
  };

  const handleSaveProgress = () => {
    // Student progress saving logic
    console.log('Saving progress...');
    // You can add actual save logic here
    alert('Progress saved successfully!');
  };

  // Determine which tabs to show based on user role
  const shouldShowTabs = () => {
    return userRole === 'teacher'; // Only teachers see tabs
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
          {/* Header with Back Button and Tabs */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
            <div className="flex items-center space-x-4">
              {shouldShowTabs() && (
                <ExamTabs activeTab={activeTab} setActiveTab={setActiveTab} />
              )}
            </div>
            <BackButton />
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {userRole === 'teacher' && activeTab === 'exam' && (
              <ExamContent questions={questions} userRole={userRole} />
            )}
            {userRole === 'teacher' && activeTab === 'submissions' && (
              <SubmissionsContent />
            )}
            {userRole !== 'teacher' && (
              <ExamContent questions={questions} userRole={userRole} />
            )}
          </div>
        </div>

        {/* Sidebar - Responsive */}
        <div className="lg:flex-shrink-0 order-first lg:order-last">
          <ExamSidebar
            examData={examData}
            approvalStatus={approvalStatus}
            onApprove={handleApprove}
            onReject={handleReject}
            onRevokeApproval={handleRevokeApproval}
            onResetStatus={handleResetStatus}
            userRole={userRole}
            onSubmitExam={handleSubmitExam}
            onSaveProgress={handleSaveProgress}
          />
        </div>
      </div>
    </Layout>
  );
};

export default ExamDetails;