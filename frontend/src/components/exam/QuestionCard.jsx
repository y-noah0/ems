import React, { useState } from 'react';

const QuestionCard = ({ question, index, userRole = 'teacher' }) => {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [textAnswer, setTextAnswer] = useState('');

  const handleOptionChange = (optionText) => {
    if (userRole === 'student') {
      setSelectedAnswer(optionText);
    }
  };

  const handleTextChange = (e) => {
    if (userRole === 'student') {
      setTextAnswer(e.target.value);
    }
  };

  const shouldShowAnswers = userRole === 'teacher';
  const shouldAllowInteraction = userRole === 'student';
  const shouldHideAnswers = userRole === 'dean';

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
          <span className="text-sm text-gray-500">/{question.maxScore || question.marks} marks</span>
        </div>
      </div>

      {/* Question Options */}
      {question.options && question.options.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {question.options.map((option, optionIndex) => {
            const isCorrect = shouldShowAnswers && option.isCorrect;
            const isSelected = selectedAnswer === option.text;
            
            return (
              <label 
                key={optionIndex} 
                className={`flex items-center space-x-3 p-2 rounded transition-colors duration-200 ${
                  shouldAllowInteraction ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                } ${
                  isCorrect && shouldShowAnswers ? 'bg-green-50 border border-green-200' : ''
                } ${
                  isSelected && shouldAllowInteraction ? 'bg-blue-50 border border-blue-200' : ''
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question._id || index}`}
                  value={option.text}
                  checked={isSelected}
                  onChange={() => handleOptionChange(option.text)}
                  disabled={!shouldAllowInteraction}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                />
                <span className={`text-sm transition-colors duration-200 ${
                  isCorrect && shouldShowAnswers ? 'text-green-800 font-medium' : 'text-gray-700'
                }`}>
                  {option.text}
                  {isCorrect && shouldShowAnswers && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Correct Answer
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200">
          {shouldAllowInteraction ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">Your answer:</p>
              <textarea
                value={textAnswer}
                onChange={handleTextChange}
                placeholder="Enter your answer here..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows="4"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              {shouldHideAnswers ? 'Open-ended question' : 'Open-ended question - no options provided'}
            </p>
          )}
        </div>
      )}

      {/* Show correct answer for open-ended questions (teacher only) */}
      {shouldShowAnswers && (!question.options || question.options.length === 0) && question.correctAnswer && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <span className="font-medium">Sample Answer:</span> {question.correctAnswer}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;