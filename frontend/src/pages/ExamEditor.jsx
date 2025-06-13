import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import examService from '../services/examService';

const ExamEditor = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subjects, setSubjects] = useState([]);
  
  // Exam form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    duration: 60,
    startTime: '',
    endTime: '',
    totalPoints: 100,
    passingPercentage: 50,
    questions: [],
    status: 'draft'
  });
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        // Fetch exam data
        const examData = await examService.getExamById(examId);
        
        // Debug: Log the raw exam data received from API
        console.log('Raw exam data from API:', examData);
        
        // Fetch subjects
        const subjectsData = await examService.getTeacherSubjects();
        setSubjects(subjectsData);
        
        // Ensure we have the correct type - default to 'midterm' if missing
        const examType = examData.type || 'midterm';
        console.log('Exam type detected:', examType);
        
        // Ensure we have the correct class ID
        const classId = examData.class?._id || examData.class;
        console.log('Class ID detected:', classId);
            // Process questions to make them compatible with frontend format
        const processedQuestions = (examData.questions || []).map(q => {
          // Generate unique ID for frontend
          const questionId = Date.now() + Math.floor(Math.random() * 1000);
          
          // Create basic question structure
          const processedQuestion = {
            id: questionId,
            text: q.text || '',
            type: q.type || 'MCQ',
            points: q.maxScore || 10,
            maxScore: q.maxScore || 10
          };
          
          // Handle options for MCQ questions
          if (q.type === 'MCQ') {
            // Create option objects for frontend
            if (Array.isArray(q.options)) {
              processedQuestion.options = q.options.map((optText, index) => ({
                id: questionId + index + 1,
                text: optText,
                isCorrect: optText === q.correctAnswer
              }));
            } else {
              // Create default options if none exist
              processedQuestion.options = [
                { id: questionId + 1, text: '', isCorrect: false },
                { id: questionId + 2, text: '', isCorrect: false },
                { id: questionId + 3, text: '', isCorrect: false },
                { id: questionId + 4, text: '', isCorrect: false }
              ];
            }
          } else if (q.type === 'open') {
            // For open-ended questions
            processedQuestion.correctAnswer = q.correctAnswer || '';
          }
          
          return processedQuestion;
        });
        
        // Log the processed questions
        console.log('Processed questions for frontend:', processedQuestions);
        
        // Populate form with ALL necessary fields from examData
        const formDataToSet = {
          title: examData.title,
          description: examData.description || '',
          subjectId: examData.subject?._id || examData.subject,
          type: examType, // Added type field which is required
          duration: examData.duration || (examData.schedule?.duration || 60),
          startTime: examData.startTime || (examData.schedule?.start ? new Date(examData.schedule.start).toISOString().slice(0, 16) : ''),
          endTime: examData.endTime || '',
          totalPoints: examData.totalPoints || 100,
          passingPercentage: examData.passingPercentage || 50,
          questions: processedQuestions,
          status: examData.status,
          class: classId, // Include class ID
          subject: examData.subject?._id || examData.subject, // Include subject ID
          instructions: examData.instructions || ''
        };
        
        console.log('Setting form data:', formDataToSet);
        setFormData(formDataToSet);
      } catch (error) {
        console.error('Error fetching exam data:', error);
        setError('Failed to load exam data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExamData();
  }, [examId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };  const addQuestion = (type = 'MCQ') => {
    let newQuestion = {
      id: Date.now(),
      text: '',
      type: type,
      points: 10,
      maxScore: 10, // Added maxScore field required by backend
    };
    
    // Add type-specific properties
    if (type === 'MCQ') {
      newQuestion.options = [
        { id: Date.now() + 1, text: '', isCorrect: false },
        { id: Date.now() + 2, text: '', isCorrect: false },
        { id: Date.now() + 3, text: '', isCorrect: false },
        { id: Date.now() + 4, text: '', isCorrect: false }
      ];
    } else if (type === 'open') {
      newQuestion.correctAnswer = ''; // For grading reference
    }
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };
  const handleQuestionChange = (questionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId) {
          const updatedQuestion = { ...q, [field]: value };
          
          // Handle type change - reset options/answers as needed
          if (field === 'type') {
            if (value === 'MCQ' && !updatedQuestion.options) {
              // Initialize options for MCQ
              updatedQuestion.options = [
                { id: Date.now() + 1, text: '', isCorrect: false },
                { id: Date.now() + 2, text: '', isCorrect: false },
                { id: Date.now() + 3, text: '', isCorrect: false },
                { id: Date.now() + 4, text: '', isCorrect: false }
              ];
              delete updatedQuestion.correctAnswer;
            } else if (value === 'open') {
              // Initialize for open-ended
              updatedQuestion.correctAnswer = '';
              delete updatedQuestion.options;
            }
          }
          
          return updatedQuestion;
        }
        return q;
      })
    }));
  };

  const handleOptionChange = (questionId, optionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map(o => 
              o.id === optionId ? { ...o, [field]: value } : o
            )
          };
        }
        return q;
      })
    }));
  };  // Helper function to format questions for backend submission
  const formatQuestionsForSubmission = (questions) => {
    return questions.map(question => {
      // Extract correct answer from options for MCQ questions
      let correctAnswer = '';
      if (question.type === 'MCQ' && question.options) {
        const correctOption = question.options.find(opt => opt.isCorrect);
        correctAnswer = correctOption ? correctOption.text : '';
      }

      // Create options array for MCQ questions
      const optionsArray = question.type === 'MCQ' && question.options 
        ? question.options.map(opt => opt.text)
        : [];

      return {
        text: question.text,
        type: question.type,
        options: optionsArray, // Ensure options is an array, not object
        correctAnswer: question.type === 'MCQ' ? correctAnswer : question.correctAnswer,
        maxScore: parseInt(question.points) || 10 // Use points as maxScore
      };
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Ensure we have all required fields, especially 'type'
      if (!formData.type) {
        setError('Exam type is required');
        setSaving(false);
        return;
      }
      
      // Log the current formData for debugging
      console.log('Current form data before submission:', formData);
      
      // Format questions properly for backend submission
      const formattedQuestions = formatQuestionsForSubmission(formData.questions);
      console.log('Formatted questions:', formattedQuestions);
      
      // Save exam (keep as draft)
      const examDataToSubmit = {
        title: formData.title,
        type: formData.type || 'midterm', // Default to midterm if missing
        questions: formattedQuestions,
        instructions: formData.instructions || '',
        status: formData.status || 'draft',
        // If there's startTime, include schedule
        ...(formData.startTime ? {
          schedule: {
            start: new Date(formData.startTime),
            duration: parseInt(formData.duration || 60)
          }
        } : {}),
        // Include other necessary fields - explicitly setting to avoid undefined
        class: formData.class || formData.classId, 
        subject: formData.subject || formData.subjectId
      };
        // Log the data we're submitting
      console.log('Submitting exam data:', examDataToSubmit);
      
      // Double-check that type is set
      if (!examDataToSubmit.type) {
        console.warn('Type is missing! Setting default value before submission.');
        examDataToSubmit.type = 'midterm';
      }
      
      const updatedExam = await examService.updateExam(examId, examDataToSubmit);
      console.log('Exam updated successfully:', updatedExam);
      
      setSuccess('Exam saved successfully!');
    } catch (error) {
      console.error('Error saving exam:', error);
      setError(error.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };  const publishExam = async () => {
    if (formData.questions.length === 0) {
      setError('Cannot publish exam with no questions');
      return;
    }
    
    if (!formData.startTime) {
      setError('Start time is required to publish an exam');
      return;
    }
    
    if (!formData.duration || formData.duration < 5) {
      setError('Duration must be at least 5 minutes');
      return;
    }
    
    // Ensure we have the required 'type' field
    if (!formData.type) {
      setError('Exam type is required. Please specify a type like "midterm", "final", etc.');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Format questions properly for backend submission
      const formattedQuestions = formatQuestionsForSubmission(formData.questions);
      console.log('Formatted questions for publishing:', formattedQuestions);
      
      // Format the data according to the Exam model structure
      // The model expects schedule.start and schedule.duration
      const examDataToSubmit = {
        title: formData.title,
        type: formData.type || 'midterm', // Default to midterm if missing
        schedule: {
          start: new Date(formData.startTime),
          duration: parseInt(formData.duration)
        },
        questions: formattedQuestions,
        instructions: formData.instructions || '',
        status: 'scheduled',
        // Include other necessary fields - explicitly set to avoid undefined
        class: formData.class || formData.classId,
        subject: formData.subject || formData.subjectId
      };
      
      console.log('Publishing exam with data:', examDataToSubmit);
      
      // Double-check that type is set
      if (!examDataToSubmit.type) {
        console.warn('Type is missing! Setting default value before submission.');
        examDataToSubmit.type = 'midterm';
      }
      
      // Update exam to scheduled status
      const updatedExam = await examService.updateExam(examId, examDataToSubmit);
      console.log('Exam updated successfully:', updatedExam);
      
      setSuccess('Exam published successfully!');
      setTimeout(() => {
        navigate('/teacher/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error publishing exam:', error);
      setError(error.message || 'Failed to publish exam');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Exam</h1>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}
      
      <Card className="mb-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Title
              </label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  name="subjectId"
                  value={formData.subjectId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {subjects.map(subject => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                  min={5}
                />
              </div>
            </div>
            
            {/* Add Exam Type dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Type
                </label>
                <select
                  name="type"
                  value={formData.type || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Exam Type</option>
                  <option value="midterm">Midterm</option>
                  <option value="final">Final</option>
                  <option value="quiz">Quiz</option>
                  <option value="hw">Homework</option>
                  <option value="ass1">Assignment 1</option>
                  <option value="ass2">Assignment 2</option>
                  <option value="exam">Regular Exam</option>
                  <option value="practice">Practice</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Start Time
              </label>
              <Input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Required when publishing. Exam will be accessible to students at this time.
              </p>
            </div>
            
            <div className="flex justify-between">              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => addQuestion('MCQ')}
                  variant="secondary"
                >
                  Add Multiple Choice
                </Button>
                <Button
                  type="button"
                  onClick={() => addQuestion('open')}
                  variant="secondary"
                >
                  Add Open-ended
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    // Add a special case of MCQ with True/False options
                    const newQuestion = {
                      id: Date.now(),
                      text: '',
                      type: 'MCQ',
                      points: 10,
                      maxScore: 10,
                      options: [
                        { id: Date.now() + 1, text: 'True', isCorrect: false },
                        { id: Date.now() + 2, text: 'False', isCorrect: false }
                      ]
                    };
                    
                    setFormData(prev => ({
                      ...prev,
                      questions: [...prev.questions, newQuestion]
                    }));
                  }}
                  variant="secondary"
                >
                  Add True/False
                </Button>
              </div>
              
              <div className="space-x-2">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
                
                <Button
                  type="button"
                  variant="primary"
                  onClick={publishExam}
                  disabled={saving || formData.questions.length === 0}
                >
                  {saving ? 'Publishing...' : 'Publish Exam'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>
      
      {/* Questions */}
      <div className="space-y-6">
        {formData.questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No questions added yet. Click 'Add Question' to get started.
          </div>
        ) : (
          formData.questions.map((question, index) => (
            <Card key={question.id} className="relative">
              <div className="absolute top-2 right-2 text-sm text-gray-500">
                Question {index + 1}
              </div>
              <div className="space-y-4 pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <textarea
                    value={question.text}
                    onChange={(e) => handleQuestionChange(question.id, 'text', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Enter question text"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Type
                    </label>                    <select
                      value={question.type}
                      onChange={(e) => handleQuestionChange(question.id, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="MCQ">Multiple Choice</option>
                      <option value="open">Open-ended</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points
                    </label>
                    <Input
                      type="number"
                      value={question.points}
                      onChange={(e) => handleQuestionChange(question.id, 'points', e.target.value)}
                      min={1}
                    />
                  </div>
                </div>
                  {question.type === 'MCQ' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Options
                    </label>
                    <div className="space-y-3">
                      {question.options.map((option, optIndex) => (
                        <div key={option.id} className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name={`question-${question.id}-correct`}
                            checked={option.isCorrect}
                            onChange={() => {
                              // Make this option correct and others incorrect
                              question.options.forEach(o => {
                                handleOptionChange(
                                  question.id, 
                                  o.id, 
                                  'isCorrect', 
                                  o.id === option.id
                                );
                              });
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <Input
                            value={option.text}
                            onChange={(e) => handleOptionChange(question.id, option.id, 'text', e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                            className="flex-grow"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {question.type === 'open' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Expected Answer (for grading reference only)
                    </label>
                    <textarea
                      value={question.correctAnswer || ''}
                      onChange={(e) => handleQuestionChange(question.id, 'correctAnswer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter expected answer or grading guidelines"
                      rows={3}
                    />
                  </div>
                )}
                
                <div className="text-right">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        questions: prev.questions.filter(q => q.id !== question.id)
                      }));
                    }}
                  >
                    Remove Question
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
};

export default ExamEditor;
