import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import examService from '../services/examService';

const ExamCreator = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    subjectId: '',
    classIds: [],
    type: 'quiz',
    schedule: {
      start: '',
      duration: 60
    },
    questions: []
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.school) {
        toast.error('No school associated with your account. Please log in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch subjects
        const subjectsData = await examService.getTeacherSubjects(currentUser.school);
        setSubjects(subjectsData);
        if (subjectsData.length > 0) {
          setFormData(prev => ({
            ...prev,
            subjectId: subjectsData[0]._id.toString()
          }));
        } else {
          toast.warn('No subjects assigned to you. Please contact your dean.');
        }

        // Fetch classes
        const classesData = await examService.getClassesForTeacher(currentUser.school);
        setClasses(classesData);
        if (classesData.length > 0) {
          setFormData(prev => ({
            ...prev,
            classIds: [classesData[0]._id.toString()]
          }));
        } else {
          toast.warn('No classes available. Please contact your dean.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(error.message || 'Failed to load subjects or classes.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'subjectId') {
      setFormData(prev => ({
        ...prev,
        subjectId: value.toString()
      }));
    } else if (name === 'classIds') {
      setFormData(prev => ({
        ...prev,
        classIds: [value.toString()]
      }));
    } else if (name === 'startTime') {
      setFormData(prev => ({
        ...prev,
        schedule: { ...prev.schedule, start: value }
      }));
    } else if (name === 'duration') {
      setFormData(prev => ({
        ...prev,
        schedule: { ...prev.schedule, duration: parseInt(value) || 60 }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      if (field === 'type' && value !== 'multiple-choice') {
        questions[index].options = [];
        questions[index].correctAnswer = '';
      }
      return { ...prev, questions };
    });
  };

  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      const options = [...questions[questionIndex].options];
      options[optionIndex] = { ...options[optionIndex], [field]: value };
      if (field === 'isCorrect' && value) {
        options.forEach((opt, idx) => {
          opt.isCorrect = idx === optionIndex;
        });
        questions[questionIndex].correctAnswer = options[optionIndex].text;
      }
      questions[questionIndex].options = options;
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      text: '',
      type: 'multiple-choice',
      maxScore: 10,
      options: [
        { id: Date.now() + 1, text: '', isCorrect: false },
        { id: Date.now() + 2, text: '', isCorrect: false },
        { id: Date.now() + 3, text: '', isCorrect: false },
        { id: Date.now() + 4, text: '', isCorrect: false }
      ],
      correctAnswer: ''
    };

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const addOption = (questionIndex) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      questions[questionIndex].options.push({
        id: Date.now(),
        text: '',
        isCorrect: false
      });
      return { ...prev, questions };
    });
  };

  const removeOption = (questionIndex, optionIndex) => {
    setFormData(prev => {
      const questions = [...prev.questions];
      questions[questionIndex].options = questions[questionIndex].options.filter(
        (_, i) => i !== optionIndex
      );
      if (questions[questionIndex].options.every(opt => !opt.isCorrect)) {
        questions[questionIndex].correctAnswer = '';
      }
      return { ...prev, questions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.school) {
      toast.error('No school associated with your account. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Validate form data
      if (!formData.title.trim()) {
        throw new Error('Exam title is required');
      }
      if (!formData.subjectId) {
        throw new Error('Please select a subject');
      }
      if (!formData.classIds.length) {
        throw new Error('Please select a class');
      }
      if (formData.schedule.start) {
        const startTime = new Date(formData.schedule.start);
        if (startTime <= new Date()) {
          throw new Error('Start time must be in the future');
        }
        if (formData.schedule.duration < 5) {
          throw new Error('Duration must be at least 5 minutes');
        }
      }
      if (formData.questions.length > 0) {
        formData.questions.forEach((q, index) => {
          if (!q.text.trim()) {
            throw new Error(`Question ${index + 1} text is required`);
          }
          if (!q.maxScore || q.maxScore < 1) {
            throw new Error(`Question ${index + 1} must have a valid score (minimum 1)`);
          }
          if (q.type === 'multiple-choice') {
            if (!q.options || q.options.length < 2) {
              throw new Error(`Question ${index + 1} must have at least 2 options`);
            }
            if (!q.options.some(opt => opt.isCorrect)) {
              throw new Error(`Question ${index + 1} must have one correct option`);
            }
          }
        });
      }

      // Prepare exam data
      const examDataToSubmit = {
        title: formData.title,
        instructions: formData.instructions || undefined,
        subjectId: formData.subjectId,
        classIds: formData.classIds,
        type: formData.type,
        teacherId: currentUser.id,
        schedule: formData.schedule.start
          ? {
            start: formData.schedule.start,
            duration: formData.schedule.duration
          }
          : undefined,
        questions: formData.questions.map(q => ({
          type: q.type,
          text: q.text,
          maxScore: q.maxScore,
          options: q.options || [],
          correctAnswer: q.correctAnswer || ''
        }))
      };

      // Create exam
      const examData = await examService.createExam(examDataToSubmit, currentUser.school);
      toast.success('Exam created successfully!');
      setTimeout(() => {
        navigate(`/teacher/exams/${examData._id}/edit`);
      }, 2000);
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error(error.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      )}

      {!loading && (
        <Card>
          <form onSubmit={handleSubmit} className="p-4">
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
                  placeholder="Enter exam title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter exam instructions"
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
                    <option value="" disabled>Select a subject</option>
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    name="classIds"
                    value={formData.classIds[0] || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="" disabled>Select a class</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>
                        {cls.className || `${cls.level}${cls.trade?.code || ''}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="assessment1">Assessment 1</option>
                    <option value="assessment2">Assessment 2</option>
                    <option value="exam">Exam</option>
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    name="duration"
                    value={formData.schedule.duration}
                    onChange={handleChange}
                    required
                    min={5}
                    placeholder="Enter duration in minutes"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <Input
                  type="datetime-local"
                  name="startTime"
                  value={formData.schedule.start}
                  onChange={handleChange}
                  placeholder="Select start time"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Questions</h3>
                {formData.questions.map((question, qIndex) => (
                  <Card key={question.id} className="mb-4 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question {qIndex + 1}
                        </label>
                        <Input
                          value={question.text}
                          onChange={e => handleQuestionChange(qIndex, 'text', e.target.value)}
                          required
                          placeholder="Enter question text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Type
                        </label>
                        <select
                          value={question.type}
                          onChange={e => handleQuestionChange(qIndex, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="multiple-choice">Multiple Choice</option>
                          <option value="true-false">True/False</option>
                          <option value="short-answer">Short Answer</option>
                          <option value="essay">Essay</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Score
                        </label>
                        <Input
                          type="number"
                          value={question.maxScore}
                          onChange={e => handleQuestionChange(qIndex, 'maxScore', parseInt(e.target.value))}
                          required
                          min={1}
                          placeholder="Enter max score"
                        />
                      </div>
                      {question.type === 'multiple-choice' && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Options</h4>
                          {question.options.map((option, oIndex) => (
                            <div key={option.id} className="flex items-center space-x-2 mb-2">
                              <Input
                                value={option.text}
                                onChange={e => handleOptionChange(qIndex, oIndex, 'text', e.target.value)}
                                required
                                placeholder={`Option ${oIndex + 1}`}
                              />
                              <input
                                type="checkbox"
                                checked={option.isCorrect}
                                onChange={e => handleOptionChange(qIndex, oIndex, 'isCorrect', e.target.checked)}
                              />
                              <Button
                                type="button"
                                variant="danger"
                                onClick={() => removeOption(qIndex, oIndex)}
                                disabled={question.options.length <= 2}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => addOption(qIndex)}
                          >
                            Add Option
                          </Button>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        Remove Question
                      </Button>
                    </div>
                  </Card>
                ))}
                <Button type="button" variant="secondary" onClick={addQuestion}>
                  Add Question
                </Button>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/teacher/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Exam'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}
    </Layout>
  );
};

export default ExamCreator;