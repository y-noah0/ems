import React from 'react';

const QuestionCard = ({ question, index }) => {
  return (
    <div className="mb-6 sm:mb-8 last:mb-0">
      {/* Question Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-2 leading-relaxed">
            {index + 1}. {question.text}
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-sm text-gray-500">/{question.marks} marks</span>
        </div>
      </div>

      {/* Question Options */}
      {question.options && question.options.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {question.options.map((option) => (
            <label key={option.id} className="flex items-center space-x-3 cursor-pointer group p-2 rounded hover:bg-gray-50">
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.id}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                {option.text}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500 italic">Open-ended question - no options provided</p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;