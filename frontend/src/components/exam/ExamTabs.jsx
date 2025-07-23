import React from 'react';

const ExamTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        onClick={() => setActiveTab('exam')}
        className={`px-3 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-l-lg transition-all duration-200 ${
          activeTab === 'exam'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        Exam
      </button>
      <button
        onClick={() => setActiveTab('submissions')}
        className={`px-3 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-r-lg transition-all duration-200 ${
          activeTab === 'submissions'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        Submissions
      </button>
    </div>
  );
};

export default ExamTabs;