import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService';

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
  const [saving, setSaving] = useState(false);  // Function to fetch submission data
  const fetchSubmissionData = async () => {
    try {
      setLoading(true);
      // Fetch submission details
      const submissionData = await examService.getSubmissionById(submissionId);
      setSubmission(submissionData);
      
      // Fetch exam details if we have it
      if (submissionData.exam) {
        const examData = await examService.getExamById(submissionData.exam);
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
        message: 'Failed to load submission details. Please try again.', 
        type: 'error' 
      });
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSubmissionData();
  }, [submissionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handler for updating points for an answer
  const handlePointsChange = (index, points) => {
    const newAnswers = [...editedAnswers];
    newAnswers[index] = {
      ...newAnswers[index],
      points: Math.min(Math.max(0, parseInt(points) || 0), exam?.questions[index]?.points || 0),
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
      await examService.updateSubmissionGrades(submissionId, { submission: updatedSubmission });
      
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
        message: 'Failed to save grades. Please try again.', 
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
      if (question.type === 'multiple-choice' && idx < newAnswers.length) {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (!correctOption) return;
        
        const studentAnswer = newAnswers[idx].text;
        const isCorrect = studentAnswer === correctOption.text;
        
        newAnswers[idx] = {
          ...newAnswers[idx],
          points: isCorrect ? question.points : 0,
          isCorrect,
          feedback: isCorrect 
            ? 'Correct answer.' 
            : `Incorrect. The correct answer is: ${correctOption.text}`,
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
        <div className="flex justify-center items-center h-screen">
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
            <Button onClick={() => navigate('/teacher/dashboard')}>
              Return to Dashboard
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
            <Button onClick={() => navigate('/teacher/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Submission Details
          </h1>
          <Button onClick={() => navigate(`/teacher/exams/${submission.exam}/results`)}>
            Back to Exam Results
          </Button>
        </div>
        
        {notification.message && notification.type === 'info' && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification({ message: null, type: 'info' })} 
          />
        )}        <Card className="mb-6">
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
                <p><span className="font-medium">Name:</span> {submission.student?.firstName} {submission.student?.lastName}</p>
                <p><span className="font-medium">Registration Number:</span> {submission.student?.registrationNumber}</p>
              </div>
              <div>
                <p><span className="font-medium">Submitted:</span> {new Date(submission.submittedAt).toLocaleString()}</p>
                <p><span className="font-medium">Score:</span> {submission.score} / {exam?.totalPoints || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Answers</h2>              <Button 
                onClick={() => {
                  const count = autoGradeMultipleChoice();
                  if (count > 0) {
                    // Show temporary notification that auto-grading was successful
                    setNotification({
                      message: `Auto-graded ${count} multiple-choice questions.`,
                      type: 'info'
                    });
                    setTimeout(() => setNotification({ message: null, type: 'info' }), 3000);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-sm"
              >
                Auto-grade Multiple Choice
              </Button>
            </div>
            
            {submission.answers?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No answers in this submission.
              </div>
            ) : (
              <div className="space-y-6">                    {editedAnswers.map((answer, index) => (
                  <div key={answer._id || index} className="border rounded-lg p-4">
                    <div className="mb-2">
                      <h3 className="font-medium">Question {index + 1}</h3>
                      <p className="text-sm text-gray-700">{exam?.questions[index]?.text || 'Question text not available'}</p>
                    </div>

                    <div className="mb-2">
                      <p className="font-medium">Student Answer:</p>
                      <div className="bg-gray-50 p-2 rounded">{answer.text}</div>
                    </div>
                    
                    {exam?.questions[index]?.type === 'multiple-choice' && (
                      <div className="mb-2">
                        <p className="font-medium">Correct Answer:</p>
                        <div className="bg-gray-50 p-2 rounded">
                          {exam.questions[index]?.options?.find(option => option.isCorrect)?.text || 'Not available'}
                        </div>
                      </div>
                    )}

                    <div className="my-4">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <label className="font-medium">Points:</label>
                        <input 
                          type="number"
                          className="w-16 px-2 py-1 border rounded"
                          min="0"
                          max={exam?.questions[index]?.points || 0}
                          value={answer.points || 0}
                          onChange={(e) => handlePointsChange(index, e.target.value)}
                        />
                        <span className="text-sm text-gray-500">of {exam?.questions[index]?.points || 0} possible</span>
                        
                        {answer.isEdited && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Unsaved changes
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <label className="font-medium block mb-1">Feedback to student:</label>
                        <textarea
                          className="w-full px-2 py-1 border rounded"
                          rows="3"
                          value={answer.feedback || ''}
                          onChange={(e) => handleFeedbackChange(index, e.target.value)}
                          placeholder="Provide feedback on this answer"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                ))}              </div>
            )}
              {/* Grade summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg mb-4">
              <div className="flex flex-wrap justify-between items-center">
                <div>
                  <h3 className="font-medium text-lg">Grade Summary</h3>
                  <p className="text-sm text-gray-600">
                    Total points earned: {editedAnswers.reduce((sum, answer) => sum + (parseInt(answer.points) || 0), 0)} 
                    / {exam?.totalPoints || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Final percentage: {exam?.totalPoints ? 
                      `${Math.round((editedAnswers.reduce((sum, answer) => sum + (parseInt(answer.points) || 0), 0) / exam.totalPoints) * 100)}%` 
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Save grades button */}
            <div className="flex flex-col space-y-2">              <Button 
                onClick={saveGrades} 
                disabled={saving || !hasUnsavedChanges}
                className={`${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'}`}
              >
                {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Grades' : 'No Changes to Save'}
              </Button>
              
              {notification.message && notification.type === 'success' && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mt-2">
                  {notification.message}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default SubmissionView;
