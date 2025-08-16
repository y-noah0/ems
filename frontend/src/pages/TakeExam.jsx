import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import examService from '../services/examService';
import submissionService from '../services/submissionService';
import { useAuth } from '../context/AuthContext';

const TakeExam = () => {
    const { currentUser } = useAuth();
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Removed mark-for-review feature; now rendering all questions at once
    const [lastSaved, setLastSaved] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    // listingMode no longer needed when rendering all questions
    const hasFetched = useRef(false);
    const [firstViolationBuffered, setFirstViolationBuffered] = useState(false);
    const [violationToast, setViolationToast] = useState(null); // simple local toast
    // Auto-submit handler
    const handleAutoSubmit = useCallback(async (reason, schoolIdOverride) => {
        if (!submission || submitting) return;
        const schoolId = schoolIdOverride || currentUser?.school;
        if (!schoolId) return;
        setSubmitting(true);
        try {
            const reasonDetails = { type: reason === 'time-expired' ? 'other' : 'tab-switch', details: reason === 'time-expired' ? 'Exam time expired' : 'Maximum violations exceeded' };
            await submissionService.autoSubmitExam(submission._id, reasonDetails, schoolId);
            localStorage.removeItem(`examTimer_${submission._id}`);
            navigate('/student/dashboard', { state: { message: reason === 'time-expired' ? 'Time expired. Exam auto-submitted.' : 'Maximum violations detected. Exam auto-submitted.' } });
        } catch (error) {
            console.error('Error auto-submitting exam:', error);
            setError('Failed to auto-submit exam: ' + (error.message || 'Unknown error'));
            setTimeout(() => navigate('/student/dashboard', { state: { message: 'Exam auto-submission failed. Please contact support.' } }), 3000);
        }
    }, [submission, submitting, currentUser, navigate]);


    // Violation logger (hoisted above all useEffects)
        const logViolation = useCallback(async (type, details, schoolId) => {
            if (!submission) return;
            // First violation: buffer locally, show toast, don't send to backend yet
            if (!firstViolationBuffered) {
                setFirstViolationBuffered(true);
                setViolationCount(1);
                setViolationToast('Violation 1/2 done.. proceed with caution');
                // auto-dismiss toast after 5s
                setTimeout(() => setViolationToast(null), 5000);
                return;
            }
            try {
                const response = await submissionService.logViolation(submission._id, type, details, schoolId);
                setViolationCount(prev => prev + 1);
                if (response.shouldAutoSubmit || violationCount + 1 >= 3) {
                    await handleAutoSubmit('violations', schoolId);
                }
            } catch (error) {
                console.error('Error logging violation:', error);
                setError('Failed to log violation. Please continue with caution.');
            }
        }, [submission, firstViolationBuffered, violationCount, handleAutoSubmit]);

    // Persist timer
    useEffect(() => {
        if (timeRemaining !== null && submission) {
            localStorage.setItem(`examTimer_${submission._id}`, timeRemaining.toString());
        }
    }, [timeRemaining, submission]);


    // Anti-cheat detection
    useEffect(() => {
        if (!submission || !currentUser?.school) return;
        const schoolId = currentUser.school;
        const handleBlur = () => logViolation('tab-switch', 'User switched away from exam tab', schoolId);
        const handleVisibilityChange = () => {
            if (document.hidden) logViolation('hidden-tab', 'Exam tab was hidden', schoolId);
        };
        const handleCopyPaste = e => {
            e.preventDefault();
            logViolation('copy-attempt', 'User attempted to copy/paste', schoolId);
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
    }, [submission, currentUser, logViolation]);

    // Removed duplicate logViolation declaration

    // Timer countdown
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;
        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1000) {
                    clearInterval(timer);
                    handleAutoSubmit('time-expired');
                    return 0;
                }
                return prev - 1000;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeRemaining, handleAutoSubmit]);

    const formatTimeRemaining = () => {
        if (timeRemaining === null || timeRemaining <= 0) return '00:00:00';
        const totalSeconds = Math.floor(timeRemaining / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Auto-save answers helper (hoisted before its useEffect)
    const saveAnswers = useCallback(async (schoolId) => {
        if (!submission || submitting) return false;
        try {
            await submissionService.saveAnswers(submission._id, answers, schoolId);
            return true;
        } catch (error) {
            console.error('Error saving answers:', error);
            return false;
        }
    }, [submission, submitting, answers]);

    // Auto-save answers
    useEffect(() => {
        if (!submission || !answers.length || !currentUser?.school) return;
        const schoolId = currentUser.school;
        const saveInterval = setInterval(async () => {
            try {
                const success = await saveAnswers(schoolId);
                if (success) setLastSaved(new Date());
            } catch (error) {
                console.error('Error during auto-save:', error);
                setError('Failed to auto-save answers. Please save manually.');
            }
        }, 30000);
        return () => clearInterval(saveInterval);
    }, [submission, answers, currentUser, saveAnswers]);

    // Fetch exam and submission
    useEffect(() => {
        if (!currentUser) {
            setError('User not authenticated. Please log in.');
            setLoading(false);
            return;
        }
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchExamAndStartSubmission = async (retries = 3, delay = 1000) => {
            setLoading(true);
            try {
                const schoolId = currentUser.school;
                if (!schoolId) throw new Error('School ID not found.');
                const examData = await examService.getExamById(examId, schoolId);
                if (!examData || !examData.questions?.length) throw new Error('Exam not found or has no questions.');
                setExam(examData);
                const submissionData = await submissionService.startExam(examId, schoolId);
                // Initialize submission using returned ID and answers
                const initSubmission = { _id: submissionData.submissionId };
                setSubmission(initSubmission);
                // Initialize answers ensuring an entry for every question so inputs are controlled
                const initialAnswersMap = new Map(
                    (submissionData.answers || []).map(a => [a.questionId, a.answer || ''])
                );
                const normalizedAnswers = examData.questions.map(q => ({
                    questionId: q._id,
                    answer: initialAnswersMap.get(q._id) || ''
                }));
                setAnswers(normalizedAnswers);
                // Set initial time remaining from server
                setTimeRemaining(submissionData.timeRemaining);
            } catch (error) {
                console.error('Error fetching exam data:', error);
                if (retries > 0 && error.message.includes('network')) {
                    setTimeout(() => fetchExamAndStartSubmission(retries - 1, delay * 2), delay);
                } else {
                    setError(error.message === 'You have already submitted this exam' ? 'This exam has already been submitted.' : 'Failed to load exam: ' + (error.message || 'Unknown error'));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchExamAndStartSubmission();
    }, [examId, currentUser]);


    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, answer: value } : a));
    };


    const handleStatementAnswerChange = (questionId, statementIndex, value) => {
        setAnswers(prev => {
            const answer = prev.find(a => a.questionId === questionId);
            const currentQuestion = exam.questions.find(q => q._id === questionId);
            const optionsLength = currentQuestion?.options?.length || 0;
            let newAnswerArray = answer?.answer ? JSON.parse(answer.answer) : Array(optionsLength).fill('');
            newAnswerArray[statementIndex] = value;
            return prev.map(a => a.questionId === questionId ? { ...a, answer: JSON.stringify(newAnswerArray) } : a);
        });
    };
    
    // Determine if a question has been answered (used in navigation)

    const goToQuestion = (index) => {
        if (!exam) return;
        const el = document.getElementById(`question-${index}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setCurrentQuestionIndex(index);
        }
    };

    const handleSubmitExam = async () => {
        if (!submission || submitting || !currentUser?.school) return;
        setSubmitting(true);
        try {
            const schoolId = currentUser.school;
            if (!await saveAnswers(schoolId)) {
                setError('Failed to save answers before submission. Please try again.');
                setSubmitting(false);
                return;
            }
            await submissionService.submitExam(submission._id, answers, schoolId);
            localStorage.removeItem(`examTimer_${submission._id}`);
            navigate('/student/dashboard', { state: { message: 'Exam submitted successfully!' } });
        } catch (error) {
            console.error('Error submitting exam:', error);
            setError('Failed to submit exam: ' + (error.message || 'Unknown error'));
            setSubmitting(false);
            setTimeout(() => navigate('/student/dashboard', { state: { message: 'Exam submission failed. Please contact support.' } }), 3000);
        }
    };


    const renderQuestions = () => {
        if (!exam?.questions?.length) {
            return (
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-center">
                    <p className="text-yellow-700 text-lg">This exam does not have any questions.</p>
                </div>
            );
        }
        return exam.questions.map((question, qIdx) => {
            const currentAnswer = answers.find(a => a.questionId === question._id) || { answer: '' };
            let selectionInstruction = '';
            let answerInput = null;
            switch (question.type) {
                case 'multiple-choice':
                    selectionInstruction = '(Select one)';
                    answerInput = (
                        <div className="space-y-4">
                            {!Array.isArray(question.options) || question.options.length === 0 ? (
                                <p className="text-red-700 text-center text-lg">No options available for this question.</p>
                            ) : (
                                question.options.map((option, idx) => (
                                    <motion.div
                                        key={option._id || idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                                        className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 shadow-sm cursor-pointer"
                                        onClick={() => handleAnswerChange(question._id, option.text)}
                                    >
                                        <input
                                            type="radio"
                                            id={`option-${question._id}-${option._id || idx}`}
                                            name={`question-${question._id}`}
                                            checked={currentAnswer.answer === option.text}
                                            onChange={() => handleAnswerChange(question._id, option.text)}
                                            className="mr-4 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                            aria-label={`Option ${idx + 1}: ${option.text}`}
                                        />
                                        <label
                                            htmlFor={`option-${question._id}-${option._id || idx}`}
                                            className="text-gray-800 text-base flex-1 cursor-pointer"
                                        >
                                            {option.text}
                                        </label>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    );
                    break;
                case 'true-false':
                case 'true-false-labeled':
                    selectionInstruction = '(Select one)';
                    answerInput = (
                        <div className="flex space-x-6 justify-center">
                            {['True', 'False'].map(value => (
                                <motion.div
                                    key={value}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 w-1/2 shadow-sm cursor-pointer"
                                    onClick={() => handleAnswerChange(question._id, value)}
                                >
                                    <input
                                        type="radio"
                                        id={`${value}-${question._id}`}
                                        name={`question-${question._id}`}
                                        checked={(currentAnswer.answer || '').toString().toLowerCase() === value.toLowerCase()}
                                        onChange={() => handleAnswerChange(question._id, value)}
                                        className="mr-4 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                        aria-label={`Answer: ${value}`}
                                    />
                                    <label
                                        htmlFor={`${value}-${question._id}`}
                                        className="text-gray-800 text-base cursor-pointer"
                                    >
                                        {value}
                                    </label>
                                </motion.div>
                            ))}
                        </div>
                    );
                    break;
                case 'true-false-statements':
                    selectionInstruction = '(Select all that apply)';
                    answerInput = (
                        <div className="space-y-6">
                            {!Array.isArray(question.options) || question.options.length === 0 ? (
                                <p className="text-red-700 text-center text-lg">No statements available for this question.</p>
                            ) : (
                                question.options.map((statement, idx) => {
                                    const answerArray = currentAnswer.answer
                                        ? JSON.parse(currentAnswer.answer)
                                        : Array(question.options.length).fill('');
                                    return (
                                        <div key={idx} className="border border-gray-200 p-5 rounded-lg shadow-sm">
                                            <p className="text-gray-800 text-base font-medium mb-3">{statement.text}</p>
                                            <div className="flex space-x-4">
                                                {['true', 'false'].map(value => (
                                                    <motion.div
                                                        key={`${value}-${idx}`}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 w-1/2 shadow-sm cursor-pointer"
                                                        onClick={() => handleStatementAnswerChange(question._id, idx, value)}
                                                    >
                                                        <input
                                                            type="radio"
                                                            id={`statement-${question._id}-${idx}-${value}`}
                                                            name={`statement-${question._id}-${idx}`}
                                                            checked={answerArray[idx] === value}
                                                            onChange={() => handleStatementAnswerChange(question._id, idx, value)}
                                                            className="mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                                            aria-label={`Statement ${idx + 1}: ${value}`}
                                                        />
                                                        <label
                                                            htmlFor={`statement-${question._id}-${idx}-${value}`}
                                                            className="text-gray-800 text-base cursor-pointer"
                                                        >
                                                            {value.charAt(0).toUpperCase() + value.slice(1)}
                                                        </label>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    );
                    break;
                case 'short-answer':
                    answerInput = (
                        <div className="mt-4">
                            <label htmlFor={`answer-${question._id}`} className="block text-base font-medium text-gray-700 mb-2">
                                Your Answer:
                            </label>
                            <ReactQuill
                                id={`answer-${question._id}`}
                                value={currentAnswer.answer}
                                onChange={value => handleAnswerChange(question._id, value)}
                                theme="snow"
                                modules={{ toolbar: [['bold', 'italic', 'underline'], ['clean']] }}
                                formats={['bold', 'italic', 'underline']}
                                className="bg-white border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition duration-200"
                                style={{ height: '150px' }}
                            />
                            <p className="mt-12 text-sm text-gray-500">
                                Provide a concise response using basic formatting if needed.
                            </p>
                        </div>
                    );
                    break;
                case 'essay':
                    answerInput = (
                        <div className="mt-4">
                            <label htmlFor={`answer-${question._id}`} className="block text-base font-medium text-gray-700 mb-2">
                                Your Answer:
                            </label>
                            <ReactQuill
                                id={`answer-${question._id}`}
                                value={currentAnswer.answer}
                                onChange={value => handleAnswerChange(question._id, value)}
                                theme="snow"
                                modules={{
                                    toolbar: [
                                        [{ header: [1, 2, false] }],
                                        ['bold', 'italic', 'underline', 'strike'],
                                        [{ list: 'ordered' }, { list: 'bullet' }],
                                        ['link'],
                                        ['clean'],
                                    ],
                                }}
                                formats={['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'link']}
                                className="bg-white border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition duration-200"
                                style={{ height: '300px' }}
                            />
                            <p className="mt-12 text-sm text-gray-500">
                                Write a detailed response using the rich text tools provided.
                            </p>
                        </div>
                    );
                    break;
                default:
                    answerInput = <p className="text-red-700 text-center text-lg">Unsupported question type.</p>;
            }
            const answered = !!currentAnswer.answer && currentAnswer.answer.length > 0;
            return (
                <motion.div
                    id={`question-${qIdx}`}
                    key={question._id || qIdx}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35 }}
                    className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-blue-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Question {qIdx + 1}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${answered ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                            {answered ? 'Answered' : 'Not Answered'}
                        </span>
                    </div>
                    <div className="mb-4">
                        <p className="text-gray-800 text-base leading-relaxed font-medium">{question.text}</p>
                        {selectionInstruction && <p className="text-blue-600 text-xs mt-2 italic">{selectionInstruction}</p>}
                    </div>
                    {answerInput}
                </motion.div>
            );
        });
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-screen">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50"></div>
                    </motion.div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8 text-center text-lg shadow-md">
                    {error}
                </div>
                <Button
                    variant="secondary"
                    onClick={() => navigate('/student/dashboard')}
                    className="block mx-auto px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-base shadow-sm"
                >
                    Back to Dashboard
                </Button>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-blue-50 to-white rounded-xl shadow-lg">
                {violationToast && (
                    <div className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded shadow animate-pulse text-sm font-medium">
                        {violationToast}
                    </div>
                )}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{exam?.title || 'Take Exam'}</h1>
                    <div className="flex flex-col itemsLayd">
                        <div
                            className={`bg-white border border-blue-200 px-6 py-3 rounded-full font-semibold text-lg shadow-sm ${timeRemaining <= 300000 ? 'text-red-800 border-red-200 animate-pulse' : 'text-blue-800'
                                }`}
                            aria-live="polite"
                        >
                            Time Remaining: {formatTimeRemaining()}
                        </div>
                        {lastSaved && (
                            <div className="text-sm text-gray-500 mt-2">
                                Last saved: {lastSaved.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </div>
                {exam?.instructions && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white border border-gray-200 p-6 rounded-lg mb-8 text-gray-700 leading-relaxed shadow-md"
                        dangerouslySetInnerHTML={{ __html: exam.instructions }}
                    />
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-lg mb-8 text-lg shadow-md"
                    >
                        {error}
                    </motion.div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3">
                        {renderQuestions()}
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-1"
                    >
                        <Card title="Question Navigation" className="mb-8 shadow-md">
                            <div className="grid grid-cols-6 gap-2">
                                {exam?.questions.map((q, idx) => {
                                    const questionAnswer = answers.find(a => a.questionId === q._id);
                                    let variant = 'secondary';
                                    if (idx === currentQuestionIndex) variant = 'primary';
                                    else if (questionAnswer?.answer) variant = 'success';
                                    return (
                                        <motion.div whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.9 }} key={q._id || idx}>
                                            <Button
                                                variant={variant}
                                                onClick={() => goToQuestion(idx)}
                                                className="w-8 h-8 p-0 min-w-0 text-[11px] font-semibold rounded-md shadow-sm"
                                                title={`Question ${idx + 1}`}
                                            >
                                                {idx + 1}
                                            </Button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            <div className="mt-6">
                                <p className="text-sm text-gray-600 mb-2 font-medium">Legend:</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 shadow-sm">Current</span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 shadow-sm">Answered</span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 shadow-sm">Unanswered</span>
                                </div>
                            </div>
                        </Card>
                        <Card title="Exam Information" className="mb-8 shadow-md">
                            <div className="space-y-3 text-sm text-gray-600">
                                <p>
                                    <span className="font-semibold">Subject: </span>
                                    {typeof exam?.subject === 'object' && exam?.subject?.name
                                        ? exam.subject.name
                                        : exam?.subject
                                            ? exam.subject.toString()
                                            : 'N/A'}
                                </p>
                                <p>
                                    <span className="font-semibold">Total Questions: </span>
                                    {exam?.questions?.length || 0}
                                </p>
                                <p>
                                    <span className="font-semibold">Total Points: </span>
                                    {exam?.totalPoints || 0}
                                </p>
                                <p>
                                    <span className="font-semibold">Violations: </span>
                                    {violationCount}
                                </p>
                            </div>
                        </Card>
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-lg shadow-md"
                        >
                            <p className="text-sm text-yellow-700">
                                <span className="font-bold">Warning: </span>Do not leave this tab. Three violations will auto-submit your exam.
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex justify-end mt-6"
                >
                    <Button
                        variant="primary"
                        onClick={handleSubmitExam}
                        disabled={submitting || !submission}
                        className="px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-lg font-medium shadow-md bg-blue-600 text-white"
                    >
                        {submitting ? 'Submitting...' : 'Submit Exam'}
                    </Button>
                </motion.div>
            </div>
        </Layout>
    );
};

export default TakeExam;

