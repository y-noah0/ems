import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import ExamTabs from '../components/exam/ExamTabs';
import ExamContent from '../components/exam/ExamContent';
import SubmissionsContent from '../components/exam/SubmissionsContent';
import ExamSidebar from '../components/exam/ExamSidebar';
import BackButton from '../components/exam/BackButton';
import examDataJson from '../data/examData.json';

const ExamManagement = () => {
  const [activeTab, setActiveTab] = useState('exam');
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    // Load data from JSON file
    setExamData(examDataJson.exam);
    setQuestions(examDataJson.questions);
  }, []);

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
              <ExamTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
            <BackButton />
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {activeTab === 'exam' && (
              <ExamContent questions={questions} />
            )}
            {activeTab === 'submissions' && (
              <SubmissionsContent />
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
          />
        </div>
      </div>
    </Layout>
  );
};

export default ExamManagement;