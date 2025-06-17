import React from 'react';
import QuestionCard from './QuestionCard';

const ExamContent = ({ questions }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Exam Preview</h2>
      </div>
      
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[calc(100vh-300px)]">
        {questions.map((question, index) => (
          <QuestionCard key={question.id} question={question} index={index} />
        ))}
      </div>
      
      {/* Footer */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-center">
          <p className="text-xs text-gray-500">© 2025 ems sys. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default ExamContent;