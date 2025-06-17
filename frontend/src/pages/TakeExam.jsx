import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService';
import submissionService from '../services/submissionService';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markedForReview, setMarkedForReview] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Setup anti-cheat detection
  useEffect(() => {
    if (!submission) return;
    const handleBlur = () => logViolation('tab-switch', 'User switched away from exam tab');
    const handleVisibilityChange = () => {
      if (document.hidden) logViolation('hidden-tab', 'Exam tab was hidden');
    };
    const handleCopyPaste = (e) => {
      e.preventDefault();
      logViolation('copy-attempt', 'User attempted to copy/paste');
    };
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
  }, [submission]);

  const logViolation = async (type, details) => {
    if (!submission) return;
    try {
      const response = await submissionService.logViolation(
        submission._id,
        type,
        details
      );
      if (response.shouldAutoSubmit) {
        await handleAutoSubmit('violations');
      }
    } catch (error) {
      console.error('Error logging violation:', error);
    }
  };

  // Timer for countdown
  useEffect(() => {
    if (!timeRemaining) return;
    const timer = setInterval(() => {
      setTimeRemaining(time => {
        if (time <= 1000) {
          clearInterval(timer);
          handleAutoSubmit('time-expired');
          return 0;
        }
        return time - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Format time remaining
  const formatTimeRemaining = () => {
    if (!timeRemaining) return '00:00:00';
    const totalSeconds = Math.floor(timeRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (!submission || !answers.length) return;
    const saveInterval = setInterval(async () => {
      try {
        await saveAnswers();
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error during auto-save:', error);
      }
    }, 30000);
    return () => clearInterval(saveInterval);
  }, [submission, answers]);

  // Fetch exam and start submission
  useEffect(() => {
    const fetchExamAndStartSubmission = async () => {
      setLoading(true);
      try {
        const examData = await examService.getExamById(examId);
        setExam(examData);
        const submissionData = await submissionService.startExam(examId);
        setSubmission(submissionData.submission);
        const initialAnswers = submissionData.submission.answers.map(a => ({
          questionId: a.questionId,
          answer: a.answer || ''
        }));
        setAnswers(initialAnswers);
        setTimeRemaining(submissionData.timeRemaining);
      } catch (error) {
        console.error('Error fetching exam data:', error);
        setError(error.message || 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };
    fetchExamAndStartSubmission();
  }, [examId]);

  // Save answers to server
  const saveAnswers = async () => {
    if (!submission) return;
    try {
      await submissionService.saveAnswers(submission._id, answers);
      return true;
    } catch (error) {
      console.error('Error saving answers:', error);
      return false;
    }
  };

  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev =>
      prev.map(a =>
        a.questionId === questionId
          ? { ...a, answer: value }
          : a
      )
    );
  };

  // Navigation
  const handleNextQuestion = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  const toggleMarkForReview = () => {
    const currentQuestionId = exam.questions[currentQuestionIndex]._id;
    setMarkedForReview(prev => {
      if (prev.includes(currentQuestionId)) {
        return prev.filter(id => id !== currentQuestionId);
      } else {
        return [...prev, currentQuestionId];
      }
    });
  };
  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  // Submit exam
  const handleSubmitExam = async () => {
    if (!window.confirm('Are you sure you want to submit this exam? You cannot make changes after submission.')) {
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await saveAnswers();
      await submissionService.submitExam(submission._id, answers);
      navigate('/student/dashboard', {
        state: { message: 'Exam submitted successfully!' }
      });
    } catch (error) {
      console.error('Error submitting exam:', error);
      setError('Failed to submit exam: ' + (error.message || 'Unknown error'));
      setTimeout(() => {
        navigate('/student/dashboard', {
          state: { message: 'Exam has been submitted, but there was an error processing your submission.' }
        });
      }, 3000);
    }
  };

  // Auto-submit exam
  const handleAutoSubmit = async (reason) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const reasonDetails = {
        type: reason === 'time-expired' ? 'other' : 'tab-switch',
        details: reason === 'time-expired'
          ? 'Exam time expired'
          : 'Maximum violations exceeded'
      };
      await submissionService.autoSubmitExam(submission._id, reasonDetails);
      setTimeout(() => {
        navigate('/student/dashboard', {
          state: {
            message: reason === 'time-expired'
              ? 'Time expired. Exam auto-submitted.'
              : 'Maximum violations detected. Exam auto-submitted.'
          }
        });
      }, 1000);
    } catch (error) {
      console.error('Error auto-submitting exam:', error);
      navigate('/student/dashboard', {
        state: {
          message: 'Exam has been submitted. There was an error processing your submission.'
        }
      });
    }
  };

  // Render current question
  const renderCurrentQuestion = () => {
    if (!exam || !exam.questions || exam.questions.length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <p className="text-yellow-700">This exam does not have any questions.</p>
        </div>
      );
    }
    const currentQuestion = exam.questions[currentQuestionIndex];
    if (!currentQuestion) {
      return (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-700">Error loading question. Please contact support.</p>
        </div>
      );
    }
    const currentAnswer = answers.find(a => a.questionId === currentQuestion._id) || { answer: '' };
    const isMarkedForReview = markedForReview.includes(currentQuestion._id);

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Question {currentQuestionIndex + 1}</h2>
          <div>
            <span className={`px-2 py-1 rounded text-sm ${isMarkedForReview
              ? 'bg-yellow-100 text-yellow-800'
              : currentAnswer.answer
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
              }`}>
              {isMarkedForReview
                ? 'Marked for Review'
                : currentAnswer.answer
                  ? 'Answered'
                  : 'Not Answered'}
            </span>
          </div>
        </div>
        {/* Question Text */}
        <div className="mb-4">
          <p className="text-gray-800">{currentQuestion.text}</p>
        </div>
        {/* Based on question type, render different input */}
        {currentQuestion.type === 'MCQ' && (
          <div className="space-y-2">
            {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, idx) => {
              // Support both string and object option formats
              const optionValue = typeof option === 'object' && option !== null
                ? (option._id || option.value || JSON.stringify(option))
                : option;
              const optionLabel = typeof option === 'object' && option !== null
                ? (option.text || option.label || option.value || JSON.stringify(option))
                : option;

              return (
                <div key={optionValue} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${idx}`}
                    name={`question-${currentQuestion._id}`}
                    checked={currentAnswer.answer === optionValue}
                    onChange={() => handleAnswerChange(currentQuestion._id, optionValue)}
                    className="mr-2"
                  />
                  <label htmlFor={`option-${idx}`} className="text-gray-700">
                    {optionLabel}
                  </label>
                </div>
              );
            })}
          </div>
        )}
        {currentQuestion.type === 'open' && (
          <div className="mt-4">
            <label htmlFor="open-answer" className="block text-sm font-medium text-gray-700 mb-2">
              Your Answer:
            </label>
            <textarea
              id="open-answer"
              value={currentAnswer.answer}
              onChange={e => handleAnswerChange(currentQuestion._id, e.target.value)}
              rows={8}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="Type your answer here..."
            />
            <p className="mt-2 text-sm text-gray-500">
              You can write as much as needed for your answer. The text area will expand as you type.
            </p>
          </div>
        )}
        <div className="flex justify-between mt-8">
          <div>
            <Button
              variant="secondary"
              onClick={toggleMarkForReview}
              className="mr-2"
            >
              {isMarkedForReview ? 'Unmark Review' : 'Mark for Review'}
            </Button>
          </div>
          <div>
            <Button
              variant="secondary"
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className="mr-2"
            >
              Previous
            </Button>
            <Button
              variant="primary"
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === exam.questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }
  // Show error state
  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/student/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Layout>
    );
  }

  // Render exam
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {exam?.title || 'Take Exam'}
        </h1>
        <div className="flex flex-col items-end">
          <div className="bg-blue-50 border border-blue-200 px-4 py-1 rounded-md text-blue-800 font-semibold">
            Time Remaining: {formatTimeRemaining()}
          </div>
          {lastSaved && (
            <div className="text-xs text-gray-500 mt-1">
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="col-span-2">
          {renderCurrentQuestion()}
          <div className="flex justify-end mt-4">
            <Button
              variant="success"
              onClick={handleSubmitExam}
              className="ml-2"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </div>
        </div>
        {/* Sidebar / Question navigator */}
        <div className="col-span-1">
          <Card title="Questions">
            <div className="grid grid-cols-4 gap-2">
              {exam?.questions.map((q, idx) => {
                const questionAnswer = answers.find(a => a.questionId === q._id);
                const isAnswered = questionAnswer && questionAnswer.answer && questionAnswer.answer.length > 0;
                const isReview = markedForReview.includes(q._id);
                let buttonVariant = 'secondary';
                if (idx === currentQuestionIndex) buttonVariant = 'primary';
                else if (isReview) buttonVariant = 'warning';
                else if (isAnswered) buttonVariant = 'success';
                return (
                  <Button
                    key={q._id}
                    variant={buttonVariant}
                    size="sm"
                    onClick={() => goToQuestion(idx)}
                    className="text-center"
                  >
                    {idx + 1}
                  </Button>
                );
              })}
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-600 mb-1">Legend:</p>
              <div className="flex flex-wrap text-xs gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800">
                  Current
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800">
                  Answered
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                  For Review
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-800">
                  Unanswered
                </span>
              </div>
            </div>
          </Card>
          <Card title="Exam Info" className="mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Subject: </span>
              {/* Render subject name if populated, else show ID as string */}
              {typeof exam?.subject === 'object' && exam?.subject?.name
                ? exam.subject.name
                : (exam?.subject ? exam.subject.toString() : 'N/A')}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Total Questions: </span>
              {exam?.questions?.length}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Total Points: </span>
              {exam?.totalPoints}
            </p>
          </Card>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-bold">Warning: </span>
                  Do not leave this tab or the exam will be auto-submitted after a number of violations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TakeExam;
