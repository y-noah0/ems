import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

const ExamSidebar = ({ examData, approvalStatus, onApprove, onReject, onRevokeApproval, onResetStatus }) => {
  return (
    <div className="w-full lg:w-80 bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6 flex flex-col">
      {/* Exam Title and Status */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">{examData.title}</h2>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs sm:text-sm font-medium text-blue-600 capitalize">{examData.status}</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-xs sm:text-sm text-gray-600">
          <span className="truncate">{examData.subject}</span>
          <span>•</span>
          <span>{examData.courseCode}</span>
        </div>
      </div>

      {/* Exam Description */}
      <div className="mb-4 sm:mb-6">
        <p className="text-sm text-gray-700 leading-relaxed">{examData.description}</p>
      </div>

      {/* Exam Details */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600">Duration</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-gray-900 text-right">
            {examData.startTime} - {examData.endTime}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Questions</span>
          <span className="text-xs sm:text-sm font-medium text-gray-900">
            {examData.totalQuestions} questions /{examData.totalMarks}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium text-gray-900">{examData.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${examData.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Approval Section */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="border-t border-gray-100 pt-4 sm:pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-900">Approval:</span>
            {approvalStatus === 'approved' && (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Approved</span>
              </div>
            )}
            {approvalStatus === 'rejected' && (
              <span className="text-sm font-medium text-red-600">Rejected</span>
            )}
          </div>
          
          {approvalStatus === 'pending' && (
            <div className="space-y-2">
              <button
                onClick={onApprove}
                className="w-full bg-gray-900 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
              >
                Approve
              </button>
              <button
                onClick={onReject}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Reject
              </button>
            </div>
          )}
          
          {approvalStatus === 'approved' && (
            <button
              onClick={onRevokeApproval}
              className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              Revoke Approval
            </button>
          )}
          
          {approvalStatus === 'rejected' && (
            <button
              onClick={onResetStatus}
              className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              Reset Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamSidebar;