// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import Layout from '../components/layout/Layout';
// import Card from '../components/ui/Card';
// import Button from '../components/ui/Button';
// import Input from '../components/ui/Input';
// import examService from '../services/examService';

// const ExamEditor = () => {
//     const { examId } = useParams();
//     const navigate = useNavigate();
//     const [loading, setLoading] = useState(true);
//     const [saving, setSaving] = useState(false);
//     const [error, setError] = useState('');
//     const [success, setSuccess] = useState('');
//     const [subjects, setSubjects] = useState([]);
//     const [classes, setClasses] = useState([]);

//     const [formData, setFormData] = useState({
//         title: '',
//         description: '',
//         subjectId: '',
//         duration: 60,
//         startTime: '',
//         endTime: '',
//         totalPoints: 100,
//         passingPercentage: 50,
//         questions: [],
//         status: 'draft',
//         class: '',
//         type: 'midterm',
//     });

//     const isValidObjectId = (id) => {
//         const objectIdRegex = /^[0-9a-fA-F]{24}$/;
//         return id && typeof id === 'string' && objectIdRegex.test(id);
//     };

//     useEffect(() => {
//         const fetchExamData = async () => {
//             console.log('Exam ID from URL:', examId);
//             if (!examId || !isValidObjectId(examId)) {
//                 console.error('Invalid examId:', examId);
//                 setError('Invalid exam ID. Please check the URL or try again.');
//                 setLoading(false);
//                 return;
//             }

//             try {
//                 // Fetch exam data
//                 const examData = await examService.getExamById(examId);
//                 console.log('Raw exam data from API:', examData);

//                 // Fetch subjects
//                 let subjectsData = [];
//                 try {
//                     subjectsData = await examService.getTeacherSubjects();
//                     console.log('Subjects data:', subjectsData);
//                     if (!Array.isArray(subjectsData)) {
//                         console.warn('Subjects data is not an array:', subjectsData);
//                         subjectsData = [];
//                     }
//                 } catch (err) {
//                     console.error('Failed to fetch subjects:', err);
//                     setError('Failed to load subjects. Please check if subjects are assigned.');
//                 }
//                 setSubjects(subjectsData);

//                 // Fetch classes (optional)
//                 let classesData = [];
//                 try {
//                     classesData = await examService.getClassesForTeacher(); // <-- FIXED: use correct service method
//                     console.log('Classes data:', classesData);
//                     if (!Array.isArray(classesData)) {
//                         console.warn('Classes data is not an array:', classesData);
//                         classesData = [];
//                     }
//                 } catch (err) {
//                     console.warn('Failed to fetch classes:', err);
//                     // Continue without classes
//                 }
//                 setClasses(classesData);

//                 const examType = examData.type || 'midterm';
//                 console.log('Exam type detected:', examType);

//                 let classId;
//                 if (Array.isArray(examData.class)) {
//                     console.warn('Class is an array:', examData.class);
//                     classId = examData.class[0]?._id || examData.class[0];
//                 } else {
//                     classId = examData.class?._id || examData.class;
//                 }
//                 if (classId && !isValidObjectId(classId)) {
//                     console.error('Invalid classId:', classId);
//                     classId = '';
//                 }
//                 console.log('Class ID detected:', classId);

//                 const processedQuestions = (examData.questions || []).map((q) => {
//                     const questionId = Date.now() + Math.floor(Math.random() * 1000);
//                     const processedQuestion = {
//                         id: questionId,
//                         text: q.text || '',
//                         type: q.type || 'MCQ',
//                         points: q.maxScore || 10,
//                         maxScore: q.maxScore || 10,
//                     };

//                     if (q.type === 'MCQ') {
//                         processedQuestion.options = Array.isArray(q.options)
//                             ? q.options.map((optText, index) => ({
//                                 id: questionId + index + 1,
//                                 text: optText,
//                                 isCorrect: optText === q.correctAnswer,
//                             }))
//                             : [
//                                 { id: questionId + 1, text: '', isCorrect: false },
//                                 { id: questionId + 2, text: '', isCorrect: false },
//                                 { id: questionId + 3, text: '', isCorrect: false },
//                                 { id: questionId + 4, text: '', isCorrect: false },
//                             ];
//                     } else if (q.type === 'open') {
//                         processedQuestion.correctAnswer = q.correctAnswer || '';
//                     }

//                     return processedQuestion;
//                 });

//                 console.log('Processed questions for frontend:', processedQuestions);

//                 const formDataToSet = {
//                     title: examData.title || '',
//                     description: examData.description || '',
//                     subjectId: examData.subject?._id || examData.subject || '',
//                     type: examType,
//                     duration: examData.duration || examData.schedule?.duration || 60,
//                     startTime:
//                         examData.startTime ||
//                         (examData.schedule?.start
//                             ? new Date(examData.schedule.start).toISOString().slice(0, 16)
//                             : ''),
//                     endTime: examData.endTime || '',
//                     totalPoints: examData.totalPoints || 100,
//                     passingPercentage: examData.passingPercentage || 50,
//                     questions: processedQuestions,
//                     status: examData.status || 'draft',
//                     class: classId || '',
//                     instructions: examData.instructions || '',
//                 };

//                 console.log('Setting form data:', formDataToSet);
//                 setFormData(formDataToSet);
//             } catch (error) {
//                 console.error('Error fetching exam data:', error);
//                 setError(
//                     error.response?.data?.message || 'Failed to load exam data. Please try again.'
//                 );
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchExamData();
//     }, [examId]);

//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setFormData((prev) => ({
//             ...prev,
//             [name]: value,
//         }));
//     };

//     const addQuestion = (type = 'MCQ') => {
//         let newQuestion = {
//             id: Date.now(),
//             text: '',
//             type: type,
//             points: 10,
//             maxScore: 10,
//         };

//         if (type === 'MCQ') {
//             newQuestion.options = [
//                 { id: Date.now() + 1, text: '', isCorrect: false },
//                 { id: Date.now() + 2, text: '', isCorrect: false },
//                 { id: Date.now() + 3, text: '', isCorrect: false },
//                 { id: Date.now() + 4, text: '', isCorrect: false },
//             ];
//         } else if (type === 'open') {
//             newQuestion.correctAnswer = '';
//         }

//         setFormData((prev) => ({
//             ...prev,
//             questions: [...prev.questions, newQuestion],
//         }));
//     };

//     const handleQuestionChange = (questionId, field, value) => {
//         setFormData((prev) => ({
//             ...prev,
//             questions: prev.questions.map((q) => {
//                 if (q.id === questionId) {
//                     const updatedQuestion = { ...q, [field]: value };

//                     if (field === 'type') {
//                         if (value === 'MCQ' && !updatedQuestion.options) {
//                             updatedQuestion.options = [
//                                 { id: Date.now() + 1, text: '', isCorrect: false },
//                                 { id: Date.now() + 2, text: '', isCorrect: false },
//                                 { id: Date.now() + 3, text: '', isCorrect: false },
//                                 { id: Date.now() + 4, text: '', isCorrect: false },
//                             ];
//                             delete updatedQuestion.correctAnswer;
//                         } else if (value === 'open') {
//                             updatedQuestion.correctAnswer = '';
//                             delete updatedQuestion.options;
//                         }
//                     }

//                     return updatedQuestion;
//                 }
//                 return q;
//             }),
//         }));
//     };

//     const handleOptionChange = (questionId, optionId, field, value) => {
//         setFormData((prev) => ({
//             ...prev,
//             questions: prev.questions.map((q) => {
//                 if (q.id === questionId) {
//                     return {
//                         ...q,
//                         options: q.options.map((o) =>
//                             o.id === optionId ? { ...o, [field]: value } : o
//                         ),
//                     };
//                 }
//                 return q;
//             }),
//         }));
//     };

//     const formatQuestionsForSubmission = (questions) => {
//         return questions.map((question, index) => {
//             if (!question.text) {
//                 throw new Error(`Question ${index + 1} text is required`);
//             }
//             let correctAnswer = '';
//             if (question.type === 'MCQ' && question.options) {
//                 const correctOption = question.options.find((opt) => opt.isCorrect);
//                 if (!correctOption) {
//                     throw new Error(`Question ${index + 1} (MCQ) must have a correct answer`);
//                 }
//                 correctAnswer = correctOption.text;
//             }
//             const optionsArray =
//                 question.type === 'MCQ' && question.options
//                     ? question.options.map((opt) => opt.text)
//                     : [];
//             return {
//                 text: question.text,
//                 type: question.type,
//                 options: optionsArray,
//                 correctAnswer:
//                     question.type === 'MCQ' ? correctAnswer : question.correctAnswer || '',
//                 maxScore: parseInt(question.points) || 10,
//             };
//         });
//     };

//     const validateFormData = () => {
//         if (!formData.title) return 'Please enter an exam title';
//         if (!formData.subjectId || !isValidObjectId(formData.subjectId))
//             return 'Please select a valid subject';
//         if (formData.class && !isValidObjectId(formData.class))
//             return 'Invalid class ID';
//         return null;
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (!isValidObjectId(examId)) {
//             setError('Invalid exam ID. Cannot save exam.');
//             return;
//         }

//         const validationError = validateFormData();
//         if (validationError) {
//             setError(validationError);
//             return;
//         }

//         setSaving(true);
//         setError('');
//         setSuccess('');

//         try {
//             if (!formData.type) {
//                 throw new Error('Exam type is required');
//             }

//             console.log('Current form data before submission:', formData);
//             const formattedQuestions = formatQuestionsForSubmission(formData.questions);
//             console.log('Formatted questions:', formattedQuestions);

//             const examDataToSubmit = {
//                 title: formData.title,
//                 type: formData.type,
//                 questions: formattedQuestions,
//                 instructions: formData.instructions || '',
//                 status: formData.status || 'draft',
//                 ...(formData.startTime
//                     ? {
//                         schedule: {
//                             start: new Date(formData.startTime),
//                             duration: parseInt(formData.duration || 60),
//                         },
//                     }
//                     : {}),
//                 class: formData.class || undefined,
//                 subject: formData.subjectId,
//             };

//             console.log('Submitting exam data:', examDataToSubmit);

//             const updatedExam = await examService.updateExam(examId, examDataToSubmit);
//             console.log('Exam updated successfully:', updatedExam);

//             setSuccess('Exam saved successfully!');
//         } catch (error) {
//             console.error('Error saving exam:', error);
//             const errorMessage =
//                 error.response?.data?.errors?.map((e) => e.msg).join('; ') ||
//                 error.response?.data?.message ||
//                 error.message ||
//                 'Failed to save exam';
//             setError(errorMessage);
//         } finally {
//             setSaving(false);
//         }
//     };

//     const publishExam = async () => {
//         if (!isValidObjectId(examId)) {
//             setError('Invalid exam ID. Cannot publish exam.');
//             return;
//         }

//         const validationError = validateFormData();
//         if (validationError) {
//             setError(validationError);
//             return;
//         }

//         if (formData.questions.length === 0) {
//             setError('Cannot publish exam with no questions');
//             return;
//         }

//         if (!formData.startTime) {
//             setError('Start time is required to publish an exam');
//             return;
//         }

//         if (!formData.duration || formData.duration < 5) {
//             setError('Duration must be at least 5 minutes');
//             return;
//         }

//         if (!formData.type) {
//             setError('Exam type is required');
//             return;
//         }

//         setSaving(true);
//         setError('');
//         setSuccess('');

//         try {
//             console.log('Current form data before publishing:', formData);
//             const formattedQuestions = formatQuestionsForSubmission(formData.questions);
//             console.log('Formatted questions for publishing:', formattedQuestions);

//             const examDataToSubmit = {
//                 title: formData.title,
//                 type: formData.type,
//                 schedule: {
//                     start: new Date(formData.startTime),
//                     duration: parseInt(formData.duration),
//                 },
//                 questions: formattedQuestions,
//                 instructions: formData.instructions || '',
//                 status: 'scheduled',
//                 class: formData.class || undefined,
//                 subject: formData.subjectId,
//             };

//             console.log('Publishing exam with data:', examDataToSubmit);

//             const updatedExam = await examService.updateExam(examId, examDataToSubmit);
//             console.log('Exam updated successfully:', updatedExam);

//             setSuccess('Exam published successfully!');
//             setTimeout(() => {
//                 navigate('/teacher/dashboard');
//             }, 2000);
//         } catch (error) {
//             console.error('Error publishing exam:', error);
//             const errorMessage =
//                 error.response?.data?.errors?.map((e) => e.msg).join('; ') ||
//                 error.response?.data?.message ||
//                 error.message ||
//                 'Failed to publish exam';
//             setError(errorMessage);
//         } finally {
//             setSaving(false);
//         }
//     };

//     if (loading) {
//         return (
//             <Layout>
//                 <div className="flex justify-center py-8">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//                 </div>
//             </Layout>
//         );
//     }

//     return (
//         <Layout>
//             <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900">Edit Exam</h1>
//             </div>

//             {error && (
//                 <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
//                     {error}
//                 </div>
//             )}

//             {success && (
//                 <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
//                     {success}
//                 </div>
//             )}

//             <Card className="mb-6">
//                 <form onSubmit={handleSubmit}>
//                     <div className="space-y-6">
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">
//                                 Exam Title
//                             </label>
//                             <Input
//                                 name="title"
//                                 value={formData.title}
//                                 onChange={handleChange}
//                                 required
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">
//                                 instructions
//                             </label>
//                             <textarea
//                                 name="description"
//                                 value={formData.instructions}
//                                 onChange={handleChange}
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                                 rows={3}
//                             />
//                         </div>

//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     Subject
//                                 </label>
//                                 <select
//                                     name="subjectId"
//                                     value={formData.subjectId}
//                                     onChange={handleChange}
//                                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                                     required
//                                 >
//                                     <option value="">Select Subject</option>
//                                     {subjects.map((subject) => (
//                                         <option key={subject._id} value={subject._id}>
//                                             {subject.name}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>

//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     Class
//                                 </label>
//                                 <select
//                                     name="class"
//                                     value={formData.class}
//                                     onChange={handleChange}
//                                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                                 >
//                                     <option value="">Select Class (optional)</option>
//                                     {classes.map((cls) => (
//                                         <option key={cls._id} value={cls._id}>
//                                             {cls.level} {cls.trade}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>
//                         </div>

//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     Duration (minutes)
//                                 </label>
//                                 <Input
//                                     type="number"
//                                     name="duration"
//                                     value={formData.duration}
//                                     onChange={handleChange}
//                                     required
//                                     min={5}
//                                 />
//                             </div>

//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     Exam Type
//                                 </label>
//                                 <select
//                                     name="type"
//                                     value={formData.type || ''}
//                                     onChange={handleChange}
//                                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                                     required
//                                 >
//                                     <option value="">Select Exam Type</option>
//                                     <option value="midterm">Midterm</option>
//                                     <option value="final">Final</option>
//                                     <option value="quiz">Quiz</option>
//                                     <option value="hw">Homework</option>
//                                     <option value="ass1">Assignment 1</option>
//                                     <option value="ass2">Assignment 2</option>
//                                     <option value="exam">Regular Exam</option>
//                                     <option value="practice">Practice</option>
//                                 </select>
//                             </div>
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">
//                                 Exam Start Time
//                             </label>
//                             <Input
//                                 type="datetime-local"
//                                 name="startTime"
//                                 value={formData.startTime}
//                                 onChange={handleChange}
//                                 className="w-full"
//                             />
//                             <p className="text-sm text-gray-500 mt-1">
//                                 Required when publishing. Exam will be accessible to students at this time.
//                             </p>
//                         </div>

//                         <div className="flex justify-between">
//                             <div className="flex flex-wrap gap-2">
//                                 <Button
//                                     type="button"
//                                     onClick={() => addQuestion('MCQ')}
//                                     variant="secondary"
//                                 >
//                                     Add Multiple Choice
//                                 </Button>
//                                 <Button
//                                     type="button"
//                                     onClick={() => addQuestion('open')}
//                                     variant="secondary"
//                                 >
//                                     Add Open-ended
//                                 </Button>
//                                 <Button
//                                     type="button"
//                                     onClick={() => {
//                                         const newQuestion = {
//                                             id: Date.now(),
//                                             text: '',
//                                             type: 'MCQ',
//                                             points: 10,
//                                             maxScore: 10,
//                                             options: [
//                                                 { id: Date.now() + 1, text: 'True', isCorrect: false },
//                                                 { id: Date.now() + 2, text: 'False', isCorrect: false },
//                                             ],
//                                         };
//                                         setFormData((prev) => ({
//                                             ...prev,
//                                             questions: [...prev.questions, newQuestion],
//                                         }));
//                                     }}
//                                     variant="secondary"
//                                 >
//                                     Add True/False
//                                 </Button>
//                             </div>

//                             <div className="space-x-2">
//                                 <Button
//                                     type="submit"
//                                     variant="secondary"
//                                     disabled={saving}
//                                 >
//                                     {saving ? 'Saving...' : 'Save Draft'}
//                                 </Button>
//                                 <Button
//                                     type="button"
//                                     variant="primary"
//                                     onClick={publishExam}
//                                     disabled={saving || formData.questions.length === 0}
//                                 >
//                                     {saving ? 'Publishing...' : 'Publish Exam'}
//                                 </Button>
//                             </div>
//                         </div>
//                     </div>
//                 </form>
//             </Card>

//             <div className="space-y-6">
//                 {formData.questions.length === 0 ? (
//                     <div className="text-center py-8 text-gray-500">
//                         No questions added yet. Click 'Add Question' to get started.
//                     </div>
//                 ) : (
//                     formData.questions.map((question, index) => (
//                         <Card key={question.id} className="relative">
//                             <div className="absolute top-2 right-2 text-sm text-gray-500">
//                                 Question {index + 1}
//                             </div>
//                             <div className="space-y-4 pt-6">
//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                                         Question Text
//                                     </label>
//                                     <textarea
//                                         value={question.text}
//                                         onChange={(e) =>
//                                             handleQuestionChange(question.id, 'text', e.target.value)
//                                         }
//                                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                                         rows={2}
//                                         placeholder="Enter question text"
//                                     />
//                                 </div>

//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                     <div>
//                                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                                             Question Type
//                                         </label>
//                                         <select
//                                             value={question.type}
//                                             onChange={(e) =>
//                                                 handleQuestionChange(question.id, 'type', e.target.value)
//                                             }
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                                         >
//                                             <option value="MCQ">Multiple Choice</option>
//                                             <option value="open">Open-ended</option>
//                                         </select>
//                                     </div>

//                                     <div>
//                                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                                             Points
//                                         </label>
//                                         <Input
//                                             type="number"
//                                             value={question.points}
//                                             onChange={(e) =>
//                                                 handleQuestionChange(question.id, 'points', e.target.value)
//                                             }
//                                             min={1}
//                                         />
//                                     </div>
//                                 </div>

//                                 {question.type === 'MCQ' && (
//                                     <div>
//                                         <label className="block text-sm font-medium text-gray-700 mb-3">
//                                             Options
//                                         </label>
//                                         <div className="space-y-3">
//                                             {question.options.map((option, optIndex) => (
//                                                 <div key={option.id} className="flex items-center space-x-3">
//                                                     <input
//                                                         type="radio"
//                                                         name={`question-${question.id}-correct`}
//                                                         checked={option.isCorrect}
//                                                         onChange={() => {
//                                                             question.options.forEach((o) => {
//                                                                 handleOptionChange(
//                                                                     question.id,
//                                                                     o.id,
//                                                                     'isCorrect',
//                                                                     o.id === option.id
//                                                                 );
//                                                             });
//                                                         }}
//                                                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
//                                                     />
//                                                     <Input
//                                                         value={option.text}
//                                                         onChange={(e) =>
//                                                             handleOptionChange(
//                                                                 question.id,
//                                                                 option.id,
//                                                                 'text',
//                                                                 e.target.value
//                                                             )
//                                                         }
//                                                         placeholder={`Option ${optIndex + 1}`}
//                                                         className="flex-grow"
//                                                     />
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 )}

//                                 {question.type === 'open' && (
//                                     <div>
//                                         <label className="block text-sm font-medium text-gray-700 mb-3">
//                                             Expected Answer (for grading reference only)
//                                         </label>
//                                         <textarea
//                                             value={question.correctAnswer || ''}
//                                             onChange={(e) =>
//                                                 handleQuestionChange(
//                                                     question.id,
//                                                     'correctAnswer',
//                                                     e.target.value
//                                                 )
//                                             }
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                                             placeholder="Enter expected answer or grading guidelines"
//                                             rows={3}
//                                         />
//                                     </div>
//                                 )}

//                                 <div className="text-right">
//                                     <Button
//                                         type="button"
//                                         variant="danger"
//                                         onClick={() => {
//                                             setFormData((prev) => ({
//                                                 ...prev,
//                                                 questions: prev.questions.filter((q) => q.id !== question.id),
//                                             }));
//                                         }}
//                                     >
//                                         Remove Question
//                                     </Button>
//                                 </div>
//                             </div>
//                         </Card>
//                     ))
//                 )}
//             </div>
//         </Layout>
//     );
// };

// export default ExamEditor;


// import axios from 'axios';

// const API_URL = 'http://localhost:5000/api';

// // Create axios instance with base URL
// const api = axios.create({
//     baseURL: API_URL,
//     headers: {
//         'Content-Type': 'application/json'
//     }
// });

// // Add interceptor to include auth token in requests
// api.interceptors.request.use(
//     config => {
//         const token = localStorage.getItem('token');
//         if (token) {
//             config.headers['Authorization'] = `Bearer ${token}`;
//         }
//         return config;
//     },
//     error => Promise.reject(error)
// );

// const examService = {
//     // Create exam
//     createExam: async (examData) => {
//         try {
//             const response = await api.post('/exams', examData);
//             return response.data.exam;
//         } catch (error) {
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Get teacher's exams
//     getTeacherExams: async () => {
//         try {
//             const response = await api.get('/exams/teacher');
//             return response.data.exams;
//         } catch (error) {
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Get exam by ID
//     getExamById: async (examId) => {
//         try {
//             const response = await api.get(`/exams/${examId}`);
//             return response.data.exam;
//         } catch (error) {
//             console.error('Error fetching exam details:', error);
//             throw error.response ? error.response.data : { message: 'Failed to load exam details. Please try again.' };
//         }
//     },

//     // Update exam
//     updateExam: async (id, examData) => {
//         try {
//             if (!examData.type) {
//                 examData.type = 'midterm';
//             }
//             if (examData.questions && examData.questions.length > 0) {
//                 examData.questions = examData.questions.map(q => {
//                     const question = { ...q };
//                     if (!question.maxScore && question.points) {
//                         question.maxScore = parseInt(question.points);
//                     }
//                     if (!question.text) {
//                         question.text = 'Untitled question';
//                     }
//                     if (question.type === 'MCQ' && question.options) {
//                         if (Array.isArray(question.options) &&
//                             question.options[0] &&
//                             typeof question.options[0] === 'object') {
//                             const correctOption = question.options.find(o => o.isCorrect);
//                             question.correctAnswer = correctOption ? correctOption.text : '';
//                             question.options = question.options.map(o => o.text || '');
//                         }
//                     }
//                     return question;
//                 });
//             }
//             const response = await api.put(`/exams/${id}`, examData);
//             return response.data.exam;
//         } catch (error) {
//             console.error('Error in updateExam:', error);
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Delete exam
//     deleteExam: async (id) => {
//         try {
//             const response = await api.delete(`/exams/${id}`);
//             return response.data;
//         } catch (error) {
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Get upcoming exams for student
//     getUpcomingExamsForStudent: async () => {
//         try {
//             const response = await api.get('/exams/student/upcoming');
//             return response.data.exams;
//         } catch (error) {
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Get all exams for student's class
//     getStudentClassExams: async () => {
//         try {
//             const response = await api.get('/exams/student/class');
//             return response.data.exams;
//         } catch (error) {
//             console.error('Error fetching class exams:', error);
//             throw error.response ? error.response.data : { message: 'Failed to load class exams. Please try again.' };
//         }
//     },

//     // Activate exam
//     activateExam: async (id) => {
//         try {
//             const response = await api.put(`/exams/${id}/activate`);
//             return response.data.exam;
//         } catch (error) {
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Complete exam
//     completeExam: async (id) => {
//         try {
//             const response = await api.put(`/exams/${id}/complete`);
//             return response.data.exam;
//         } catch (error) {
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Get exam submissions
//     getExamSubmissions: async (examId) => {
//         try {
//             const response = await api.get(`/submissions/exam/${examId}`);
//             return response.data.submissions;
//         } catch (error) {
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Get submission by ID
//     getSubmissionById: async (submissionId) => {
//         try {
//             const response = await api.get(`/submissions/${submissionId}`);
//             const data = response.data;
//             if (data.success && data.submission) {
//                 const submission = data.submission;
//                 if (submission.status === 'graded' && (!submission.score || submission.score === 0)) {
//                     submission.score = submission.answers.reduce(
//                         (sum, answer) => sum + (parseInt(answer.score || answer.points || 0) || 0),
//                         0
//                     );
//                 }
//                 if (submission.answers) {
//                     submission.answers = submission.answers.map(answer => ({
//                         ...answer,
//                         points: parseInt(answer.score || answer.points || 0) || 0
//                     }));
//                 }
//                 return submission;
//             }
//             throw new Error('Invalid submission data received');
//         } catch (error) {
//             console.error('Error fetching submission:', error);
//             throw error;
//         }
//     },

//     // Schedule an exam
//     scheduleExam: async (id, scheduleData) => {
//         try {
//             const response = await api.put(`/exams/${id}/schedule`, scheduleData);
//             return response.data.exam;
//         } catch (error) {
//             throw error.response ? error.response.data : { message: 'Network error' };
//         }
//     },

//     // Get teacher subjects
//     getTeacherSubjects: async () => {
//         try {
//             const response = await api.get('/subjects/teacher');
//             return response.data.subjects;
//         } catch (error) {
//             console.error('Error fetching teacher subjects:', error);
//             throw error.response ? error.response.data : { message: 'Failed to load subjects. Please try again.' };
//         }
//     },

//     // Get all classes associated with teacher's subjects
//     getClassesForTeacher: async () => {
//         try {
//             const response = await api.get('/exams/classes');
//             return response.data.classes;
//         } catch (error) {
//             console.error('Error fetching teacher classes:', error);
//             throw error.response ? error.response.data : { message: 'Failed to load classes. Please try again.' };
//         }
//     },

//     // Update submission with grades
//     updateSubmissionGrades: async (submissionId, gradesData) => {
//         try {
//             const response = await api.post(`/submissions/${submissionId}/grade`, gradesData);
//             if (!response.ok) {
//                 const error = await response.json();
//                 throw new Error(error.message || 'Failed to update grades');
//             }
//             const data = await response.json();
//             return data;
//         } catch (error) {
//             console.error('Error updating submission grades:', error);
//             throw error;
//         }
//     },

//     // Get all teacher submissions
//     getTeacherSubmissions: async () => {
//         try {
//             const response = await api.get('/submissions/teacher');
//             return response.data.submissions;
//         } catch (error) {
//             console.error('Error fetching teacher submissions:', error);
//             throw error.response ? error.response.data : { message: 'Failed to load submissions' };
//         }
//     }
// };

// export default examService;
