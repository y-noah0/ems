import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService.fixed';

// Notification component for user feedback
const Notification = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
    type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
      type === 'info' ? 'bg-blue-100 border-blue-400 text-blue-700' :
        'bg-yellow-100 border-yellow-400 text-yellow-700';

  return (
    <div className={`${bgColor} px-4 py-3 rounded relative mb-4 border`}>
      <span className="block sm:inline">{message}</span>
      <button
        className="absolute top-0 right-0 px-4 py-3"
        onClick={onClose}
      >
        <span className="text-xl">&times;</span>
      </button>
    </div>
  );
};

const SubmissionView = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ message: null, type: 'success' });
  const [editedAnswers, setEditedAnswers] = useState([]);
  const [saving, setSaving] = useState(false);

  // Function to fetch submission data
  const fetchSubmissionData = async () => {
    try {
      setLoading(true);
      // Fetch submission details
      const submissionData = await examService.getSubmissionById(submissionId);
      setSubmission(submissionData);

      // Fetch exam details if we have it
      if (submissionData.exam) {
        const examData = await examService.getExamById(
          typeof submissionData.exam === 'object' ? submissionData.exam._id : submissionData.exam
        );
        setExam(examData);

        // Initialize editedAnswers with current answers data
        if (submissionData.answers) {
          setEditedAnswers(submissionData.answers.map(answer => ({
            ...answer,
            feedback: answer.feedback || '',
            points: answer.points || 0,
            isEdited: false
          })));
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching submission:', err);
      setNotification({
        message: err.message || 'Failed to load submission details. Please try again.',
        type: 'error'
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionData();
  }, [submissionId]);

  // Handler for updating points for an answer
  const handlePointsChange = (index, points) => {
    const newAnswers = [...editedAnswers];
    const maxPoints = exam?.questions[index]?.maxScore || exam?.questions[index]?.points || 0;

    newAnswers[index] = {
      ...newAnswers[index],
      points: Math.min(Math.max(0, parseInt(points) || 0), maxPoints),
      isEdited: true
    };
    setEditedAnswers(newAnswers);
  };

  // Handler for updating feedback for an answer
  const handleFeedbackChange = (index, feedback) => {
    const newAnswers = [...editedAnswers];
    newAnswers[index] = {
      ...newAnswers[index],
      feedback,
      isEdited: true
    };
    setEditedAnswers(newAnswers);
  };

  // Save all grading changes
  const saveGrades = async () => {
    try {
      setSaving(true);
      setNotification({ message: null, type: 'info' });

      // Calculate total score
      const totalScore = editedAnswers.reduce((sum, answer) => sum + (parseInt(answer.points) || 0), 0);

      // Prepare updated submission data
      const updatedSubmission = {
        ...submission,
        answers: editedAnswers,
        score: totalScore,
        status: 'graded'
      };

      // Update the submission with grades
      await examService.updateSubmissionGrades(submissionId, { grades });

      // Update local state
      setSubmission(updatedSubmission);

      // Reset edited flag
      setEditedAnswers(editedAnswers.map(answer => ({ ...answer, isEdited: false })));

      setNotification({
        message: 'Grades saved successfully!',
        type: 'success'
      });
      setSaving(false);
    } catch (err) {
      console.error('Error saving grades:', err);
      setNotification({
        message: err.message || 'Failed to save grades. Please try again.',
        type: 'error'
      });
      setSaving(false);
    }
  };

  // Check if any answers have been edited
  const hasUnsavedChanges = editedAnswers.some(answer => answer.isEdited);

  // Auto-grade multiple-choice questions
  const autoGradeMultipleChoice = () => {
    if (!exam || !editedAnswers.length) return;

    const newAnswers = [...editedAnswers];
    let autoGradedCount = 0;

    exam.questions.forEach((question, idx) => {
      // Check if the question is MCQ/multiple-choice type
      if ((question.type === 'MCQ' || question.type === 'multiple-choice') && idx < newAnswers.length) {
        let correctAnswer = '';
        let correctOption;

        // Handle different exam question formats
        if (Array.isArray(question.options)) {
          if (typeof question.options[0] === 'object') {
            correctOption = question.options.find(opt => opt.isCorrect);
            correctAnswer = correctOption?.text || '';
          } else if (typeof question.options[0] === 'string' && question.correctAnswer) {
            correctAnswer = question.correctAnswer;
          }
        }

        if (!correctAnswer) return;

        const studentAnswer = newAnswers[idx].answer || newAnswers[idx].text;
        const isCorrect = studentAnswer === correctAnswer;

        newAnswers[idx] = {
          ...newAnswers[idx],
          points: isCorrect ? (question.points || question.maxScore || 0) : 0,
          isCorrect,
          feedback: isCorrect
            ? 'Correct answer.'
            : `Incorrect. The correct answer is: ${correctAnswer}`,
          isEdited: true
        };

        autoGradedCount++;
      }
    });

    setEditedAnswers(newAnswers);
    return autoGradedCount;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (notification.message && notification.type === 'error' && !submission) {
    return (
      <Layout>
        <Card className="mx-auto my-8 max-w-4xl">
          <div className="p-6 text-center">
            <div className="text-red-500 text-xl mb-4">{notification.message}</div>
            <Button onClick={() => navigate('/teacher/submissions')}>
              Return to Submissions List
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  if (!submission) {
    return (
      <Layout>
        <Card className="mx-auto my-8 max-w-4xl">
          <div className="p-6 text-center">
            <div className="text-xl mb-4">Submission not found</div>
            <Button onClick={() => navigate('/teacher/submissions')}>
              Return to Submissions List
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Submission Review
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate('/teacher/submissions')}
              variant="secondary"
              className="text-sm"
            >
              All Submissions
            </Button>
            {submission.exam && (
              <Button
                onClick={() => navigate(`/teacher/exams/${typeof submission.exam === 'object' ? submission.exam._id : submission.exam}/results`)}
                variant="secondary"
                className="text-sm"
              >
                Exam Results
              </Button>
            )}
          </div>
        </div>

        {notification.message && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification({ message: null, type: notification.type })}
          />
        )}

        <Card className="mb-6">
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-semibold">Student Information</h2>
              <button
                onClick={fetchSubmissionData}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                aria-label="Refresh submission data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Student Name:</span> {submission.student?.firstName} {submission.student?.lastName}</p>
                <p><span className="font-medium">Registration Number:</span> {submission.student?.registrationNumber}</p>
                <p><span className="font-medium">Exam:</span> {exam?.title || 'N/A'}</p>
              </div>
              <div>
                <p><span className="font-medium">Submitted:</span> {new Date(submission.submittedAt).toLocaleString()}</p>
                <p><span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${submission.status === 'graded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {submission.status === 'graded' ? 'Graded' : 'Pending Review'}
                  </span>
                </p>
                {submission.status === 'graded' && (
                  <p><span className="font-medium">Score:</span> <span className="font-semibold">{submission.score}</span> / {exam?.totalPoints || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold">Student Answers & Grading</h2>

              <Button
                onClick={() => {
                  const count = autoGradeMultipleChoice();
                  if (count > 0) {
                    setNotification({
                      message: `Auto-graded ${count} multiple-choice questions. Don't forget to save your changes!`,
                      type: 'info'
                    });
                  } else {
                    setNotification({
                      message: 'No multiple-choice questions found to auto-grade.',
                      type: 'info'
                    });
                  }
                }}
                variant="secondary"
                className="text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Auto-grade Multiple Choice
              </Button>
            </div>

            {!editedAnswers?.length ? (
              <div className="text-center py-8 text-gray-500">
                No answers found in this submission.
              </div>
            ) : (
              <div className="space-y-6">
                {editedAnswers.map((answer, index) => (
                  <div
                    key={answer._id || index}
                    className={`border rounded-lg p-4 ${answer.isEdited ? 'border-blue-300 bg-blue-50' : ''}`}
                  >
                    <div className="mb-2">
                      <div className="flex justify-between mb-1">
                        <h3 className="font-medium text-lg">Question {index + 1}</h3>
                        {answer.isEdited && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Unsaved changes
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700">{exam?.questions[index]?.text || 'Question text not available'}</p>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-sm text-gray-600">Student Answer:</p>
                      <div className="mt-1 text-gray-800">{answer.answer || answer.text || 'No answer provided'}</div>
                    </div>

                    {exam?.questions[index]?.type === 'MCQ' && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm text-gray-600">Expected Answer:</p>
                        <div className="mt-1 text-gray-800">
                          {exam.questions[index].correctAnswer ||
                            (exam.questions[index].options?.find(option =>
                              option.isCorrect)?.text) || 'Not specified'}
                        </div>
                      </div>
                    )}

                    <div className="my-4">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <label htmlFor={`points-${index}`} className="font-medium">Points:</label>
                        <input
                          id={`points-${index}`}
                          type="number"
                          className="w-20 px-3 py-1 border rounded"
                          min="0"
                          max={exam?.questions[index]?.maxScore || exam?.questions[index]?.points || 0}
                          value={answer.points || 0}
                          onChange={(e) => handlePointsChange(index, e.target.value)}
                        />
                        <span className="text-sm text-gray-500">
                          of {exam?.questions[index]?.maxScore || exam?.questions[index]?.points || 0} possible
                        </span>
                      </div>

                      <div>
                        <label htmlFor={`feedback-${index}`} className="font-medium">Feedback:</label>
                        <textarea
                          id={`feedback-${index}`}
                          className="w-full px-3 py-2 border rounded"
                          rows="3"
                          value={answer.feedback || ''}
                          onChange={(e) => handleFeedbackChange(index, e.target.value)}
                          placeholder="Provide feedback on this answer"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Grade summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-lg">Grade Summary</h3>
                  <p className="text-gray-600">
                    Total points earned: <span className="font-semibold">
                      {editedAnswers.reduce((sum, answer) => sum + (parseInt(answer.points) || 0), 0)}
                    </span> / {exam?.totalPoints || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">
                    Final percentage: <span className="font-semibold">
                      {exam?.totalPoints ?
                        `${Math.round((editedAnswers.reduce((sum, answer) => sum + (parseInt(answer.points) || 0), 0) / exam.totalPoints) * 100)}%`
                        : 'N/A'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Save grades button */}
            <div className="flex justify-end">
              <Button
                onClick={saveGrades}
                disabled={saving || !hasUnsavedChanges}
                className={`${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'} px-6`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : hasUnsavedChanges ? 'Save Grades' : 'No Changes to Save'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default SubmissionView;
