import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ExamContent from '../../components/exam/ExamContent';
import ExamSidebar from '../../components/exam/ExamSidebar';
import BackButton from '../../components/exam/BackButton';
import examService from '../../services/examService';
import deanService from '../../services/deanService';
import { toast } from 'react-toastify';

const DeanExamDetails = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
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
          progress: 0, // Dean doesn't see progress
          courseCode: exam.classes?.[0]?.name || exam.subject?.name || 'N/A',
          status: exam.status || 'draft'
        };
        
        setExamData(transformedExamData);
        setQuestions(exam.questions || []);
        setApprovalStatus(exam.status === 'approved' ? 'approved' : exam.status === 'rejected' ? 'rejected' : 'pending');
      } catch (error) {
        console.error('Error fetching exam data:', error);
        setError('Failed to load exam data');
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  const handleApprove = async () => {
    try {
      await deanService.reviewExam(examId, 'approved', feedback);
      setApprovalStatus('approved');
      toast.success('Exam approved successfully');
    } catch (error) {
      console.error('Error approving exam:', error);
      toast.error('Failed to approve exam');
    }
  };

  const handleReject = async () => {
    if (!feedback) {
      toast.error('Please provide feedback for rejection');
      return;
    }
    
    try {
      await deanService.reviewExam(examId, 'rejected', feedback);
      setApprovalStatus('rejected');
      toast.success('Exam rejected with feedback');
    } catch (error) {
      console.error('Error rejecting exam:', error);
      toast.error('Failed to reject exam');
    }
  };

  const handleRevokeApproval = async () => {
    try {
      await deanService.reviewExam(examId, 'pending', feedback);
      setApprovalStatus('pending');
      toast.success('Approval revoked');
    } catch (error) {
      console.error('Error revoking approval:', error);
      toast.error('Failed to revoke approval');
    }
  };

  const handleFeedbackChange = (e) => {
    setFeedback(e.target.value);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <div className="text-red-500">{error}</div>
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
              <h1 className="text-xl font-semibold text-gray-900">Exam Review</h1>
            </div>
            <BackButton />
          </div>

          {/* Content Area - Dean only sees exam overview, no answers */}
          <div className="flex-1 min-h-0">
            <ExamContent questions={questions} userRole="dean" />
          </div>
          
          {/* Feedback textarea */}
          <div className="mt-4">
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
              Feedback/Comments
            </label>
            <textarea
              id="feedback"
              name="feedback"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Provide feedback about this exam"
              value={feedback}
              onChange={handleFeedbackChange}
            />
          </div>
        </div>

        {/* Sidebar - Dean can approve/reject */}
        <div className="lg:flex-shrink-0 order-first lg:order-last">
          <ExamSidebar
            examData={examData}
            approvalStatus={approvalStatus}
            onApprove={handleApprove}
            onReject={handleReject}
            onRevokeApproval={handleRevokeApproval}
            userRole="dean"
          />
        </div>
      </div>
    </Layout>
  );
};

export default DeanExamDetails;
