import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaBook, FaUsers, FaCalendar, FaPlayCircle, FaCheckCircle, FaTrash, FaEdit, FaEye, FaArrowLeft, FaQuestionCircle, FaSpinner, FaCheck } from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService';

const ExamView = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [examData, subjectsData, classesData] = await Promise.all([
          examService.getExamById(examId),
          examService.getTeacherSubjects(),
          examService.getClassesForTeacher(),
        ]);
        setExam(examData);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        setClasses(Array.isArray(classesData) ? classesData : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load exam data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [examId]);

  const handleActivateExam = async () => {
    try {
      const updatedExam = await examService.activateExam(examId);
      setExam(updatedExam);
      toast.success('Exam activated successfully!');
    } catch (err) {
      console.error('Error activating exam:', err);
      setError('Failed to activate exam. Please try again.');
      toast.error('Failed to activate exam.');
    }
  };

  const handleCompleteExam = async () => {
    try {
      const updatedExam = await examService.completeExam(examId);
      setExam(updatedExam);
      toast.success('Exam completed successfully!');
    } catch (err) {
      console.error('Error completing exam:', err);
      setError('Failed to complete exam. Please try again.');
      toast.error('Failed to complete exam.');
    }
  };

  const handleUpdateExam = async (e) => {
    e.preventDefault();
    try {
      const updatedData = {
        subjectId: exam.subject?._id,
        classIds: exam.classes?.map((cls) => cls._id) || [],
      };
      const updatedExam = await examService.updateExam(examId, updatedData);
      setExam(updatedExam);
      setError(null);
      toast.success('Exam updated successfully!');
    } catch (err) {
      console.error('Error updating exam:', err);
      setError('Failed to update exam.');
      toast.error('Failed to update exam.');
    }
  };

  const handleDeleteExam = async () => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await examService.deleteExam(examId);
      toast.success('Exam deleted successfully!');
      navigate('/teacher/dashboard');
    } catch (err) {
      console.error('Error deleting exam:', err);
      setError('Failed to delete exam.');
      toast.error('Failed to delete exam.');
    }
  };

  const totalPoints = useMemo(() => {
    return exam?.questions?.reduce((sum, q) => sum + (parseInt(q.maxScore) || 0), 0) || 0;
  }, [exam]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  if (loading) {
    return (
      <Layout>
        <motion.div
          className="flex justify-center items-center h-screen"
          variants={itemVariants}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <FaSpinner className="h-12 w-12 text-indigo-600" aria-hidden="true" />
          </motion.div>
        </motion.div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <motion.div variants={itemVariants}>
          <Card className="mx-auto my-8 max-w-2xl bg-gray-50 border-indigo-200">
            <div className="p-8 text-center">
              <motion.div
                className="text-5xl text-red-500 mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
              >
                ⚠️
              </motion.div>
              <div className="text-red-600 text-xl mb-6" aria-live="assertive">{error}</div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => navigate('/teacher/dashboard')}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2 shadow-md"
                  aria-label="Return to dashboard"
                >
                  <FaArrowLeft className="h-4 w-4" />
                  Return to Dashboard
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <motion.div variants={itemVariants}>
          <Card className="mx-auto my-8 max-w-2xl bg-gray-50 border-indigo-200">
            <div className="p-8 text-center">
              <motion.div
                className="text-5xl mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
              >
                📚
              </motion.div>
              <div className="text-xl text-gray-900 mb-6">Exam not found</div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => navigate('/teacher/dashboard')}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2 shadow-md"
                  aria-label="Return to dashboard"
                >
                  <FaArrowLeft className="h-4 w-4" />
                  Return to Dashboard
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        className="container mx-auto px-4 py-8 max-w-7xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="flex justify-between items-center mb-8" variants={itemVariants}>
          <div className="flex items-center gap-4">
            <FaBook className="h-8 w-8 text-indigo-600" aria-hidden="true" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium capitalize ${exam.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : exam.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-800'
                        : exam.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                >
                  {exam.status}
                </span>
              </div>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => navigate('/teacher/dashboard')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2 shadow-md"
              aria-label="Back to dashboard"
            >
              <FaArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={itemVariants}>
              <Card className="bg-gray-50 border-indigo-200 hover:border-indigo-300 transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FaBook className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-xl font-semibold text-indigo-600">Exam Details</h2>
                  </div>
                  <form onSubmit={handleUpdateExam}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Subject
                          </label>
                          <select
                            value={exam.subject?._id || ''}
                            onChange={(e) =>
                              setExam({
                                ...exam,
                                subject: {
                                  _id: e.target.value,
                                  name: subjects.find((s) => s._id === e.target.value)?.name,
                                },
                              })
                            }
                            className={`w-full px-3 py-2 border border-indigo-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 transition duration-200 ${exam.status !== 'draft' ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                            disabled={exam.status !== 'draft'}
                            aria-label="Select subject"
                          >
                            <option value="">Select Subject</option>
                            {subjects.map((subject) => (
                              <option key={subject._id} value={subject._id}>
                                {subject.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Classes
                          </label>
                          <select
                            multiple
                            value={exam.classes?.map((cls) => cls._id) || []}
                            onChange={(e) => {
                              const selectedIds = Array.from(e.target.selectedOptions).map(
                                (opt) => opt.value
                              );
                              setExam({
                                ...exam,
                                classes: selectedIds.map((id) =>
                                  classes.find((cls) => cls._id === id)
                                ),
                              });
                            }}
                            className={`w-full px-3 py-2 border border-indigo-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 transition duration-200 h-24 ${exam.status !== 'draft' ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                            disabled={exam.status !== 'draft'}
                            aria-label="Select classes"
                          >
                            {classes.map((cls) => (
                              <option key={cls._id} value={cls._id}>
                                {cls.className || `${cls.level || ''}${cls.trade?.code || ''}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Type
                          </label>
                          <p className="px-3 py-2 bg-gray-100 border border-indigo-300 rounded-md text-gray-700">
                            {exam.type.charAt(0).toUpperCase() + exam.type.slice(1)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Questions
                          </label>
                          <p className="px-3 py-2 bg-gray-100 border border-indigo-300 rounded-md text-gray-700">
                            {exam.questions?.length || 0}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Total Points
                          </label>
                          <p className="px-3 py-2 bg-gray-100 border border-indigo-300 rounded-md text-gray-700">
                            {totalPoints}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-indigo-600 mb-1">
                            Created
                          </label>
                          <p className="px-3 py-2 bg-gray-100 border border-indigo-300 rounded-md text-gray-700">
                            {new Date(exam.createdAt).toLocaleDateString('en-US', {
                              dateStyle: 'medium',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    {exam.status === 'draft' && (
                      <motion.div className="mt-6" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          type="submit"
                          className="flex items-center gap-2 w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 shadow-md"
                          aria-label="Update exam"
                        >
                          <FaEdit className="h-4 w-4" />
                          Update Exam
                        </Button>
                      </motion.div>
                    )}
                  </form>
                </div>
              </Card>
            </motion.div>

            {exam.schedule && (
              <motion.div variants={itemVariants}>
                <Card className="bg-gray-50 border-indigo-200 hover:border-indigo-300 transition-all duration-200">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FaCalendar className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-xl font-semibold text-indigo-600">Schedule</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-indigo-600 mb-1">
                          Start Date
                        </label>
                        <p className="px-3 py-2 bg-gray-100 border border-indigo-300 rounded-md text-gray-700">
                          {new Date(exam.schedule.start).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-indigo-600 mb-1">
                          Duration
                        </label>
                        <p className="px-3 py-2 bg-gray-100 border border-indigo-300 rounded-md text-gray-700">
                          {exam.schedule.duration} minutes
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-indigo-600 mb-1">
                          End Date
                        </label>
                        <p className="px-3 py-2 bg-gray-100 border border-indigo-300 rounded-md text-gray-700">
                          {new Date(
                            new Date(exam.schedule.start).getTime() +
                            exam.schedule.duration * 60000
                          ).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <Card className="bg-gray-50 border-indigo-200 hover:border-indigo-300 transition-all duration-200">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <FaQuestionCircle className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-xl font-semibold text-indigo-600">Questions</h2>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
                        className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-md px-4 py-2"
                        aria-label="Edit questions"
                      >
                        <FaEdit className="h-4 w-4" />
                        Edit Questions
                      </Button>
                    </motion.div>
                  </div>

                  {exam.questions?.length === 0 ? (
                    <div className="text-center py-8">
                      <motion.div
                        className="text-5xl mb-4"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                      >
                        📝
                      </motion.div>
                      <p className="text-gray-600 mb-4">No questions added to this exam yet.</p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 shadow-md"
                          aria-label="Add questions"
                        >
                          <FaPlus className="h-4 w-4" />
                          Add Questions
                        </Button>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {exam.questions?.map((question, index) => (
                        <motion.div
                          key={question._id || index}
                          className="border border-indigo-200 rounded-md p-4 bg-white hover:bg-indigo-50 transition-all duration-200"
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white text-sm font-medium">
                                {index + 1}
                              </span>
                              <h3 className="font-medium text-gray-900">
                                Question {index + 1} ({question.type.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())})
                              </h3>
                            </div>
                            <span className="text-gray-600 text-sm">{question.maxScore || question.points || 0} pts</span>
                          </div>
                          <p className="text-gray-800 mt-1">{question.text}</p>
                          {(question.type === 'multiple-choice' || question.type === 'true-false' || question.type === 'true-false-labeled' || question.type === 'true-false-statements') &&
                            question.options?.length > 0 && (
                              <div className="mt-3">
                                <ul className="space-y-2">
                                  {question.options.map((option, optIdx) => (
                                    <li
                                      key={optIdx}
                                      className={`flex items-center gap-2 pl-2 text-sm ${option.isCorrect ? 'bg-green-100 text-green-800 font-medium rounded-md p-2' : 'text-gray-700'
                                        }`}
                                    >
                                      {option.isCorrect && <FaCheck className="h-4 w-4 text-green-600" />}
                                      {option.text}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {(question.type === 'short-answer' || question.type === 'essay') && question.correctAnswer && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Answer:</span> {question.correctAnswer}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <Card className="bg-gray-50 border-indigo-200 hover:border-indigo-300 transition-all duration-200">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaPlayCircle className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-indigo-600">Actions</h2>
                </div>
                <div className="space-y-3">
                  {exam.status === 'draft' && (
                    <>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
                          className="flex items-center gap-2 w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 shadow-md"
                          aria-label="Edit exam"
                        >
                          <FaEdit className="h-4 w-4" />
                          Edit Exam
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => navigate(`/teacher/exams/${examId}/schedule`)}
                          className="flex items-center gap-2 w-full justify-center bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-md px-4 py-2"
                          aria-label="Schedule exam"
                        >
                          <FaCalendar className="h-4 w-4" />
                          Schedule Exam
                        </Button>
                      </motion.div>
                    </>
                  )}
                  {exam.status === 'scheduled' && (
                    <>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleActivateExam}
                          className="flex items-center gap-2 w-full justify-center bg-green-600 hover:bg-green-700 text-white rounded-md px-4 py-2 shadow-md"
                          aria-label="Activate exam"
                        >
                          <FaPlayCircle className="h-4 w-4" />
                          Activate Exam
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => navigate(`/teacher/exams/${examId}/schedule`)}
                          className="flex items-center gap-2 w-full justify-center bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-md px-4 py-2"
                          aria-label="Change schedule"
                        >
                          <FaCalendar className="h-4 w-4" />
                          Change Schedule
                        </Button>
                      </motion.div>
                    </>
                  )}
                  {exam.status === 'active' && (
                    <>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleCompleteExam}
                          className="flex items-center gap-2 w-full justify-center bg-amber-600 hover:bg-amber-700 text-white rounded-md px-4 py-2 shadow-md"
                          aria-label="Complete exam"
                        >
                          <FaCheckCircle className="h-4 w-4" />
                          Complete Exam
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => navigate(`/teacher/exams/${examId}/results`)}
                          className="flex items-center gap-2 w-full justify-center bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-md px-4 py-2"
                          aria-label="View results"
                        >
                          <FaEye className="h-4 w-4" />
                          View Results (Live)
                        </Button>
                      </motion.div>
                    </>
                  )}
                  {exam.status === 'completed' && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => navigate(`/teacher/exams/${examId}/results`)}
                        className="flex items-center gap-2 w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 shadow-md"
                        aria-label="View and grade results"
                      >
                        <FaEye className="h-4 w-4" />
                        View & Grade Results
                      </Button>
                    </motion.div>
                  )}
                  <div className="border-t border-indigo-200 pt-3 mt-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleDeleteExam}
                        className="flex items-center gap-2 w-full justify-center bg-gray-600 hover:bg-gray-700 text-white rounded-md px-4 py-2 shadow-md"
                        aria-label="Delete exam"
                      >
                        <FaTrash className="h-4 w-4" />
                        Delete Exam
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default ExamView;