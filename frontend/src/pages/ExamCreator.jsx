import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FaPlus, FaTrash, FaCheck, FaTimes, FaSpinner, FaBook, FaClock, FaQuestionCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import MultiSelect from './multiSelect';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import examService from '../services/examService';

const ExamCreator = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const initialFormData = {
    title: '',
    instructions: '',
    subjectIds: [],
    classIds: [],
    type: 'quiz',
    schedule: {
      start: '',
      duration: 60,
    },
    questions: [],
  };
  const [formData, setFormData] = useState(initialFormData);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean'],
    ],
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.school) {
        toast.error('No school associated with your account. Please log in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const subjectsData = await examService.getTeacherSubjects(currentUser.school);
        setSubjects(subjectsData);
        if (subjectsData.length === 0) {
          toast.warn('No subjects assigned to you. Please contact your dean.');
        }

        const classesData = await examService.getClassesForTeacher(currentUser.school);
        setClasses(classesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(error.message || 'Failed to load subjects or classes.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  useEffect(() => {
    setIsDirty(JSON.stringify(formData) !== JSON.stringify(initialFormData));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'startTime') {
      const startTime = value ? new Date(value).toISOString() : '';
      setFormData((prev) => ({
        ...prev,
        schedule: { ...prev.schedule, start: startTime },
      }));
    } else if (name === 'duration') {
      setFormData((prev) => ({
        ...prev,
        schedule: { ...prev.schedule, duration: parseInt(value) || 60 },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleInstructionsChange = (value) => {
    const plainText = value.replace(/<[^>]+>/g, '');
    if (plainText.length > 1000) {
      toast.error('Instructions cannot exceed 1000 characters');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      instructions: value,
    }));
  };

  const handleSubjectIdsChange = (newSubjectIds) => {
    setFormData((prev) => ({
      ...prev,
      subjectIds: newSubjectIds,
    }));
  };

  const handleClassIdsChange = (newClassIds) => {
    setFormData((prev) => ({
      ...prev,
      classIds: newClassIds,
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      if (field === 'type') {
        if (value === 'multiple-choice' || value === 'true-false-statements') {
          questions[index].options = [
            { id: Date.now() + 1, text: '', isCorrect: false },
            { id: Date.now() + 2, text: '', isCorrect: false },
          ];
          questions[index].correctAnswer = [];
        } else if (value === 'true-false' || value === 'true-false-labeled') {
          questions[index].options = [
            { id: Date.now() + 1, text: 'True', isCorrect: false },
            { id: Date.now() + 2, text: 'False', isCorrect: false },
          ];
          questions[index].correctAnswer = value === 'true-false' ? 'true' : [];
        } else {
          questions[index].options = [];
          questions[index].correctAnswer = value === 'essay' ? '' : '';
        }
      }
      return { ...prev, questions };
    });
  };

  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[questionIndex].options];
      if (field === 'isCorrect') {
        if (questions[questionIndex].type === 'true-false') {
          options.forEach((opt, i) => {
            options[i].isCorrect = i === optionIndex ? value : false;
          });
          questions[questionIndex].correctAnswer = options[optionIndex].text;
        } else if (questions[questionIndex].type === 'multiple-choice' || questions[questionIndex].type === 'true-false-statements') {
          if (value && !options[optionIndex].text.trim()) {
            toast.error(`Option ${optionIndex + 1} must have text before marking as correct`);
            return prev;
          }
          options[optionIndex] = { ...options[optionIndex], [field]: value };
          questions[questionIndex].correctAnswer = options
            .filter((opt) => opt.isCorrect)
            .map((opt) => opt.text)
            .filter((text) => text.trim());
        } else if (questions[questionIndex].type === 'true-false-labeled') {
          options[optionIndex] = { ...options[optionIndex], [field]: value };
          questions[questionIndex].correctAnswer = options
            .filter((opt) => opt.isCorrect)
            .map((opt) => opt.text)
            .filter((text) => text.trim());
        }
      } else {
        options[optionIndex] = { ...options[optionIndex], [field]: value };
        if (questions[questionIndex].type !== 'true-false' && questions[questionIndex].type !== 'true-false-labeled') {
          questions[questionIndex].correctAnswer = options
            .filter((opt) => opt.isCorrect)
            .map((opt) => opt.text)
            .filter((text) => text.trim());
        }
      }
      questions[questionIndex].options = options;
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    if (isAdding) return;
    if (formData.questions.length >= 50) {
      toast.error('Cannot add more than 50 questions');
      return;
    }
    setIsAdding(true);
    const newQuestion = {
      id: Date.now(),
      text: '',
      type: 'multiple-choice',
      maxScore: 10,
      options: [
        { id: Date.now() + 1, text: '', isCorrect: false },
        { id: Date.now() + 2, text: '', isCorrect: false },
      ],
      correctAnswer: [],
    };
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    setTimeout(() => setIsAdding(false), 100);
  };

  const removeQuestion = (index) => {
    if (isAdding) return;
    setIsAdding(true);
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
    setTimeout(() => setIsAdding(false), 100);
  };

  const addOption = (questionIndex) => {
    if (isAdding) return;
    setIsAdding(true);
    setFormData((prev) => {
      const questions = [...prev.questions];
      if (questions[questionIndex].type === 'true-false' || questions[questionIndex].type === 'true-false-labeled') {
        toast.error('True/False questions cannot have additional options');
        setTimeout(() => setIsAdding(false), 100);
        return prev;
      }
      if (questions[questionIndex].options.length >= 10) {
        toast.error(`Question ${questionIndex + 1} cannot have more than 10 options`);
        setTimeout(() => setIsAdding(false), 100);
        return prev;
      }
      questions[questionIndex].options.push({
        id: Date.now(),
        text: '',
        isCorrect: false,
      });
      setTimeout(() => setIsAdding(false), 100);
      return { ...prev, questions };
    });
  };

  const removeOption = (questionIndex, optionIndex) => {
    if (isAdding) return;
    setIsAdding(true);
    setFormData((prev) => {
      const questions = [...prev.questions];
      if (questions[questionIndex].type === 'true-false' || questions[questionIndex].type === 'true-false-labeled') {
        toast.error('True/False questions must have exactly two options');
        setTimeout(() => setIsAdding(false), 100);
        return prev;
      }
      if (questions[questionIndex].options.length <= 2) {
        toast.error(`Question ${questionIndex + 1} must have at least 2 options`);
        setTimeout(() => setIsAdding(false), 100);
        return prev;
      }
      questions[questionIndex].options = questions[questionIndex].options.filter(
        (_, i) => i !== optionIndex
      );
      questions[questionIndex].correctAnswer = questions[questionIndex].options
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.text)
        .filter((text) => text.trim());
      setTimeout(() => setIsAdding(false), 100);
      return { ...prev, questions };
    });
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('Discard changes?')) return;
    navigate('/teacher/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.school) {
      toast.error('No school associated with your account. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      if (!formData.title.trim()) {
        throw new Error('Exam title is required');
      }
      if (formData.title.length > 100) {
        throw new Error('Exam title cannot exceed 100 characters');
      }
      const plainInstructions = formData.instructions.replace(/<[^>]+>/g, '');
      if (plainInstructions.length > 1000) {
        throw new Error('Instructions cannot exceed 1000 characters');
      }
      if (!formData.subjectIds.length) {
        throw new Error('Please select at least one subject');
      }
      if (formData.subjectIds.length > 10) {
        throw new Error('Cannot select more than 10 subjects');
      }
      if (!formData.subjectIds.every(id => subjects.some(s => s._id.toString() === id))) {
        throw new Error('Invalid subject ID selected');
      }
      if (!formData.classIds.length) {
        throw new Error('Please select at least one class');
      }
      if (formData.classIds.length > 10) {
        throw new Error('Cannot select more than 10 classes');
      }
      if (!formData.classIds.every(id => classes.some(c => c._id.toString() === id))) {
        throw new Error('Invalid class ID selected');
      }
      if (!formData.schedule.start) {
        throw new Error('Start time is required');
      }
      const startTime = new Date(formData.schedule.start);
      if (startTime <= new Date()) {
        throw new Error('Start time must be in the future');
      }
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (startTime > oneYearFromNow) {
        throw new Error('Start time cannot be more than one year in the future');
      }
      if (isNaN(formData.schedule.duration) || formData.schedule.duration <= 0) {
        throw new Error('Duration must be a positive number');
      }
      if (formData.schedule.duration < 5) {
        throw new Error('Duration must be at least 5 minutes');
      }
      if (['quiz', 'exam'].includes(formData.type) && formData.questions.length === 0) {
        throw new Error('At least one question is required for this exam type');
      }
      if (formData.questions.length > 50) {
        throw new Error('Cannot create exam with more than 50 questions');
      }
      if (formData.questions.length > 0) {
        formData.questions.forEach((q, index) => {
          if (!q.text.trim()) {
            throw new Error(`Question ${index + 1} text is required`);
          }
          if (q.text.length > 500) {
            throw new Error(`Question ${index + 1} text cannot exceed 500 characters`);
          }
          if (isNaN(q.maxScore) || q.maxScore <= 0) {
            throw new Error(`Question ${index + 1} must have a positive score`);
          }
          if (q.type === 'multiple-choice' || q.type === 'true-false-statements') {
            if (!q.options || q.options.length < 2) {
              throw new Error(`Question ${index + 1} must have at least 2 options`);
            }
            if (q.options.length > 10) {
              throw new Error(`Question ${index + 1} cannot have more than 10 options`);
            }
            if (q.options.some(opt => !opt.text.trim())) {
              throw new Error(`Question ${index + 1} options must have non-empty text`);
            }
            if (!q.options.some((opt) => opt.isCorrect)) {
              throw new Error(`Question ${index + 1} must have at least one correct option`);
            }
            if (q.correctAnswer.some((text) => !text.trim())) {
              throw new Error(`Question ${index + 1} correct options must have non-empty text`);
            }
            if (q.options.every(opt => opt.isCorrect)) {
              toast.warn(`Question ${index + 1}: All options are marked correct. Ensure this is intentional.`);
            }
          }
          if (q.type === 'true-false') {
            if (!q.options || q.options.length !== 2 || q.options[0].text !== 'True' || q.options[1].text !== 'False') {
              throw new Error(`Question ${index + 1} must have exactly two options: True and False`);
            }
            if (!q.options.some((opt) => opt.isCorrect)) {
              throw new Error(`Question ${index + 1} must have one correct option (True or False)`);
            }
            if (q.correctAnswer !== 'True' && q.correctAnswer !== 'False') {
              throw new Error(`Question ${index + 1} must have a correct answer of True or False`);
            }
          }
          if (q.type === 'true-false-labeled') {
            if (!q.options || q.options.length !== 2 || q.options[0].text !== 'True' || q.options[1].text !== 'False') {
              throw new Error(`Question ${index + 1} must have exactly two options: True and False`);
            }
            if (!q.options.some((opt) => opt.isCorrect)) {
              throw new Error(`Question ${index + 1} must have at least one correct option (True or False)`);
            }
            if (q.correctAnswer.some((text) => !text.trim())) {
              throw new Error(`Question ${index + 1} correct options must have non-empty text`);
            }
            if (q.options.every(opt => opt.isCorrect)) {
              toast.warn(`Question ${index + 1}: Both True and False are marked correct. Ensure this is intentional.`);
            }
          }
          if (q.type === 'short-answer' && !q.correctAnswer.trim()) {
            throw new Error(`Question ${index + 1} must have a correct answer`);
          }
          if (q.type === 'short-answer' && q.correctAnswer.length > 200) {
            throw new Error(`Question ${index + 1} correct answer cannot exceed 200 characters`);
          }
          if (q.type === 'essay' && q.correctAnswer && q.correctAnswer.length > 2000) {
            throw new Error(`Question ${index + 1} expected answer cannot exceed 2000 characters`);
          }
        });
      }

      const examDataToSubmit = {
        title: formData.title,
        instructions: formData.instructions || undefined,
        subjectIds: formData.subjectIds,
        classIds: formData.classIds,
        type: formData.type,
        teacherId: currentUser.id,
        schedule: {
          start: formData.schedule.start,
          duration: formData.schedule.duration,
        },
        questions: formData.questions.map((q) => ({
          type: q.type,
          text: q.text,
          maxScore: q.maxScore,
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
        })),
      };

      const examData = await examService.createExam(examDataToSubmit, currentUser.school);
      toast.success('Exam created successfully!');
      setTimeout(() => {
        navigate(`/teacher/exams/${examData._id}/edit`);
      }, 2000);
    } catch (error) {
      console.error('Error creating exam:', error);
      const errorMsg = error.code === 'ERR_NETWORK'
        ? 'Network error: Please check your connection and try again'
        : error.errors?.map((e) => e.msg).join(', ') || error.message || 'Failed to create exam';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <Layout>
      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FaBook className="mr-2 h-6 w-6 text-indigo-600" aria-hidden="true" />
          Create New Exam
        </h1>
      </motion.div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <FaSpinner className="h-16 w-16 text-indigo-600" aria-hidden="true" />
          </motion.div>
        </div>
      )}

      {!loading && (
        <Card className="bg-white">
          <motion.form
            onSubmit={handleSubmit}
            className="p-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="space-y-6">
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-indigo-600 mb-1 flex items-center">
                  <FaBook className="mr-1 h-4 w-4 text-indigo-600" aria-hidden="true" />
                  Exam Title
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Enter exam title"
                  className="transition duration-200 focus:ring-2 focus:ring-indigo-500 border-indigo-300"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-indigo-600 mb-1 flex items-center">
                  <FaBook className="mr-1 h-4 w-4 text-indigo-600" aria-hidden="true" />
                  Instructions
                </label>
                <ReactQuill
                  value={formData.instructions}
                  onChange={handleInstructionsChange}
                  modules={quillModules}
                  className="bg-white border border-indigo-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition duration-200"
                  placeholder="Enter exam instructions (optional)"
                />
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div variants={itemVariants}>
                  <MultiSelect
                    label="Subjects"
                    name="subjectIds"
                    options={subjects}
                    selectedValues={formData.subjectIds}
                    onChange={handleSubjectIdsChange}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <MultiSelect
                    label="Classes"
                    name="classIds"
                    options={classes}
                    selectedValues={formData.classIds}
                    onChange={handleClassIdsChange}
                  />
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-medium text-indigo-600 mb-1 flex items-center">
                    <FaBook className="mr-1 h-4 w-4 text-indigo-600" aria-hidden="true" />
                    Exam Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                    required
                  >
                    <option value="assessment1">Assessment 1</option>
                    <option value="assessment2">Assessment 2</option>
                    <option value="exam">Exam</option>
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-medium text-indigo-600 mb-1 flex items-center">
                    <FaClock className="mr-1 h-4 w-4 text-indigo-600" aria-hidden="true" />
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
                    className="transition duration-200 focus:ring-2 focus:ring-indigo-500 border-indigo-300"
                  />
                </motion.div>
              </div>

              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-indigo-600 mb-1 flex items-center">
                  <FaClock className="mr-1 h-4 w-4 text-indigo-600" aria-hidden="true" />
                  Start Time
                </label>
                <Input
                  type="datetime-local"
                  name="startTime"
                  value={formData.schedule.start ? new Date(formData.schedule.start).toISOString().slice(0, 16) : ''}
                  onChange={handleChange}
                  required
                  placeholder="Select start time"
                  className="transition duration-200 focus:ring-2 focus:ring-indigo-500 border-indigo-300"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <h3 className="text-lg font-medium text-indigo-600 mb-4 flex items-center">
                  <FaQuestionCircle className="mr-2 h-5 w-5 text-indigo-600" aria-hidden="true" />
                  Questions
                </h3>
                {formData.questions.map((question, qIndex) => (
                  <motion.div
                    key={question.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="mb-4"
                  >
                    <Card className="p-4 bg-gray-50 shadow-lg">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Question {qIndex + 1}
                          </label>
                          <Input
                            value={question.text}
                            onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                            required
                            maxLength={500}
                            placeholder="Enter question text"
                            className="transition duration-200 focus:ring-2 focus:ring-indigo-500 border-indigo-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Question Type
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                          >
                            <option value="multiple-choice">Multiple Choice</option>
                            <option value="true-false">True/False (Single Correct)</option>
                            <option value="true-false-labeled">True/False (Fixed Options)</option>
                            <option value="true-false-statements">True/False (Statements)</option>
                            <option value="short-answer">Short Answer</option>
                            <option value="essay">Essay</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Max Score
                          </label>
                          <Input
                            type="number"
                            value={question.maxScore}
                            onChange={(e) => handleQuestionChange(qIndex, 'maxScore', parseInt(e.target.value))}
                            required
                            min={1}
                            placeholder="Enter max score"
                            className="transition duration-200 focus:ring-2 focus:ring-indigo-500 border-indigo-300"
                          />
                        </div>
                        {(question.type === 'multiple-choice' || question.type === 'true-false' || question.type === 'true-false-labeled' || question.type === 'true-false-statements') && (
                          <div>
                            <h4 className="text-sm font-medium text-indigo-600 mb-2">
                              {question.type === 'true-false' ? 'Options (Select the correct answer)' : question.type === 'true-false-statements' ? 'Statements (Mark each as True/Correct)' : 'Options (Select all correct answers)'}
                            </h4>
                            {question.options.map((option, oIndex) => (
                              <motion.div
                                key={option.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center space-x-2 mb-2"
                              >
                                {question.type === 'true-false' ? (
                                  <>
                                    <span className="flex-1 px-3 py-2 bg-gray-100 border border-indigo-300 rounded-md text-gray-700">
                                      {option.text}
                                    </span>
                                    <input
                                      type="radio"
                                      name={`correctAnswer-${qIndex}`}
                                      checked={option.isCorrect}
                                      onChange={(e) => handleOptionChange(qIndex, oIndex, 'isCorrect', e.target.checked)}
                                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-indigo-300"
                                      aria-label={`Mark ${option.text} as correct`}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Input
                                      value={option.text}
                                      onChange={(e) => handleOptionChange(qIndex, oIndex, 'text', e.target.value)}
                                      required
                                      maxLength={200}
                                      placeholder={question.type === 'true-false-statements' ? `Statement ${oIndex + 1}` : `Option ${oIndex + 1}`}
                                      className="transition duration-200 focus:ring-2 focus:ring-indigo-500 border-indigo-300"
                                      disabled={question.type === 'true-false-labeled'}
                                    />
                                    <input
                                      type={question.type === 'true-false' ? 'radio' : 'checkbox'}
                                      checked={option.isCorrect}
                                      onChange={(e) => handleOptionChange(qIndex, oIndex, 'isCorrect', e.target.checked)}
                                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-indigo-300 rounded"
                                      aria-label={question.type === 'true-false-statements' ? `Mark statement ${oIndex + 1} as True/Correct` : `Mark ${option.text || `option ${oIndex + 1}`} as correct`}
                                    />
                                    {(question.type === 'multiple-choice' || question.type === 'true-false-statements') && (
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                          type="button"
                                          onClick={() => removeOption(qIndex, oIndex)}
                                          disabled={question.options.length <= 2 || isAdding}
                                          className="bg-gray-600 hover:bg-gray-700"
                                          aria-label={`Remove ${question.type === 'true-false-statements' ? 'statement' : 'option'} ${oIndex + 1}`}
                                        >
                                          <FaTrash className="h-4 w-4 text-white" aria-hidden="true" />
                                        </Button>
                                      </motion.div>
                                    )}
                                  </>
                                )}
                              </motion.div>
                            ))}
                            {(question.type === 'multiple-choice' || question.type === 'true-false-statements') && (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  type="button"
                                  onClick={() => addOption(qIndex)}
                                  disabled={isAdding}
                                  className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                                  aria-label={`Add new ${question.type === 'true-false-statements' ? 'statement' : 'option'}`}
                                >
                                  <FaPlus className="h-4 w-4 mr-1" aria-hidden="true" />
                                  Add {question.type === 'true-false-statements' ? 'Statement' : 'Option'}
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        )}
                        {question.type === 'short-answer' && (
                          <div>
                            <h4 className="text-sm font-medium text-indigo-600 mb-2">Correct Answer</h4>
                            <Input
                              value={question.correctAnswer}
                              onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                              required
                              maxLength={200}
                              placeholder="Enter correct answer"
                              className="transition duration-200 focus:ring-2 focus:ring-indigo-500 border-indigo-300"
                            />
                          </div>
                        )}
                        {question.type === 'essay' && (
                          <div>
                            <h4 className="text-sm font-medium text-indigo-600 mb-2">Expected Answer (Optional)</h4>
                            <textarea
                              value={question.correctAnswer}
                              onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                              maxLength={2000}
                              className="w-full px-3 py-2 border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                              rows={4}
                              placeholder="Enter expected answer for grading guidance (optional)"
                            />
                          </div>
                        )}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            disabled={isAdding}
                            className="flex items-center bg-gray-600 hover:bg-gray-700"
                            aria-label={`Remove question ${qIndex + 1}`}
                          >
                            <FaTrash className="h-4 w-4 mr-1 text-white" aria-hidden="true" />
                            Remove Question
                          </Button>
                        </motion.div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    onClick={addQuestion}
                    disabled={isAdding}
                    className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                    aria-label="Add new question"
                  >
                    <FaPlus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Add Question
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div
                className="flex justify-end space-x-2"
                variants={itemVariants}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center bg-gray-600 hover:bg-gray-700"
                    aria-label="Cancel exam creation"
                  >
                    <FaTimes className="h-4 w-4 mr-1" aria-hidden="true" />
                    Cancel
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                    aria-label="Create exam"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mr-1"
                      >
                        <FaSpinner className="h-4 w-4" aria-hidden="true" />
                      </motion.div>
                    ) : (
                      <FaCheck className="h-4 w-4 mr-1" aria-hidden="true" />
                    )}
                    {loading ? 'Creating...' : 'Create Exam'}
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </motion.form>
        </Card>
      )}
    </Layout>
  );
};

export default ExamCreator;