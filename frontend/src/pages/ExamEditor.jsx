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
        
        // Fetch subjects
        const subjectsData = await examService.getTeacherSubjects();
        setSubjects(subjectsData);
        
        // Populate form
        setFormData({
          title: examData.title,
          description: examData.description || '',
          subjectId: examData.subject,
          duration: examData.duration,
          startTime: examData.startTime || '',
          endTime: examData.endTime || '',
          totalPoints: examData.totalPoints || 100,
          passingPercentage: examData.passingPercentage || 50,
          questions: examData.questions || [],
          status: examData.status
        });
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
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      text: '',
      type: 'multiple_choice',
      points: 10,
      options: [
        { id: Date.now() + 1, text: '', isCorrect: false },
        { id: Date.now() + 2, text: '', isCorrect: false },
        { id: Date.now() + 3, text: '', isCorrect: false },
        { id: Date.now() + 4, text: '', isCorrect: false }
      ]
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const handleQuestionChange = (questionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      )
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Save exam (keep as draft)
      await examService.updateExam(examId, {
        ...formData,
        status: formData.status
      });
      
      setSuccess('Exam saved successfully!');
    } catch (error) {
      console.error('Error saving exam:', error);
      setError(error.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };
  const publishExam = async () => {
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
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Format the data according to the Exam model structure
      // The model expects schedule.start and schedule.duration
      const examDataToSubmit = {
        ...formData,
        schedule: {
          start: new Date(formData.startTime),
          duration: parseInt(formData.duration)
        },
        status: 'scheduled'
      };
      
      // Update exam to scheduled status
      await examService.updateExam(examId, examDataToSubmit);
      
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
            
            <div className="flex justify-between">
              <Button
                type="button"
                onClick={addQuestion}
                variant="secondary"
              >
                Add Question
              </Button>
              
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
                    </label>
                    <select
                      value={question.type}
                      onChange={(e) => handleQuestionChange(question.id, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True/False</option>
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
