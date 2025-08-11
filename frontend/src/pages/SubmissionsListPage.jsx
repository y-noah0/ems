import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FaSearch, FaFilter, FaBook, FaUsers, FaCheckCircle, FaFileAlt, FaSpinner, FaChevronDown } from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ExamCard from '../components/ui/ExamCard';
import examService from '../services/examService';
import submissionService from '../services/submissionService';

const SubmissionsListPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjectOptionsList, setSubjectOptionsList] = useState([]);
  const [classOptionsList, setClassOptionsList] = useState([]);
  const [showExamDropdown, setShowExamDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [visibleSubmissions, setVisibleSubmissions] = useState(10);
  const examDropdownRef = useRef(null);
  const subjectDropdownRef = useRef(null);
  const classDropdownRef = useRef(null);
  const filterMenuRef = useRef(null);

  // Custom debounce function
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Handle click outside for dropdowns and filter menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target)) {
        setShowExamDropdown(false);
      }
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
        setShowSubjectDropdown(false);
      }
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
        setShowClassDropdown(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch exams, submissions, subjects, and classes
  const fetchData = async () => {
    if (!currentUser?.school) {
      const errorMsg = 'No school associated with your account. Please log in again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      navigate('/login');
      return;
    }

    const schoolId = currentUser.school;
    setLoading(true);
    try {
      const [examsData, submissionsData, subjectsData, classesData] = await Promise.all([
        examService.getTeacherExams(schoolId),
        submissionService.getTeacherSubmissions(schoolId),
        examService.getTeacherSubjects(schoolId),
        examService.getClassesForTeacher(schoolId),
      ]);
      setExams(Array.isArray(examsData) ? examsData : []);
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
      setSubjectOptionsList(
        Array.isArray(subjectsData)
          ? subjectsData.map((s) => ({ value: s._id, label: s.name || 'Unknown Subject' }))
          : []
      );
      setClassOptionsList(
        Array.isArray(classesData)
          ? classesData.map((c) => ({
            value: c._id,
            label: c.className || `${c.level}${c.trade?.code || ''}` || 'Unknown Class',
          }))
          : []
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMsg = error.message || 'Failed to load data';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, navigate]);

  // Debounced search handler
  const debouncedSetSearchTerm = debounce((value) => setSearchTerm(value), 300);

  // Filter and group submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
      const matchesSearch =
        searchTerm === '' ||
        (submission.exam?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (submission.student?.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (submission.student?.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (submission.student?.registrationNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesExam = !selectedExam || submission.exam?._id === selectedExam.value;
      const matchesSubject =
        !selectedSubject || submission.exam?.subject?._id === selectedSubject.value;
      const matchesClass =
        !selectedClass ||
        submission.exam?.classes?.some((c) => c._id === selectedClass.value);
      return matchesStatus && matchesSearch && matchesExam && matchesSubject && matchesClass;
    });
  }, [submissions, filterStatus, searchTerm, selectedExam, selectedSubject, selectedClass]);

  const groupedSubmissions = useMemo(() => {
    return filteredSubmissions.reduce((acc, submission) => {
      const examId = submission.exam?._id;
      if (!examId) return acc; // Skip submissions with no exam
      if (!acc[examId]) {
        acc[examId] = {
          exam: submission.exam,
          submissions: [],
        };
      }
      acc[examId].submissions.push(submission);
      return acc;
    }, {});
  }, [filteredSubmissions]);

  // Calculate total submissions for pagination
  const totalSubmissions = Object.values(groupedSubmissions).reduce(
    (sum, { submissions }) => sum + submissions.length,
    0
  );

  return (
    <Layout>
      <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto font-roboto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <FaFileAlt className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600 animate-pulse" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Submissions</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search submissions..."
                className="pl-10 pr-4 py-2 w-full bg-gray-50 border border-blue-300 rounded-full text-sm sm:text-base text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-300 hover:shadow-md"
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                aria-label="Search submissions"
              />
            </div>
            <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
              <div ref={examDropdownRef} className="relative w-full sm:w-auto">
                <button
                  className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-gray-50 border border-blue-300 rounded-md text-sm sm:text-base text-gray-700 w-full sm:min-w-[140px] hover:bg-blue-50 transition duration-300 hover:shadow-md"
                  onClick={() => setShowExamDropdown(!showExamDropdown)}
                  aria-label="Select exam filter"
                  aria-expanded={showExamDropdown}
                >
                  <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                  {selectedExam?.label || 'Exam'}
                  <FaChevronDown
                    className={`h-4 sm:h-5 w-4 sm:w-5 text-blue-600 transition-transform duration-200 ${showExamDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
                {showExamDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white border border-blue-200 rounded-lg shadow-xl z-20 overflow-hidden animate-slide-down">
                    <button
                      className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${!selectedExam ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-blue-50'}`}
                      onClick={() => {
                        setSelectedExam(null);
                        setShowExamDropdown(false);
                      }}
                    >
                      <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                      All Exams
                    </button>
                    {exams.map((exam) => (
                      <button
                        key={exam._id}
                        className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${selectedExam?.value === exam._id ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-blue-50'}`}
                        onClick={() => {
                          setSelectedExam({ value: exam._id, label: exam.title });
                          setShowExamDropdown(false);
                        }}
                      >
                        <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                        {exam.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div ref={subjectDropdownRef} className="relative w-full sm:w-auto">
                <button
                  className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-gray-50 border border-blue-300 rounded-md text-sm sm:text-base text-gray-700 w-full sm:min-w-[140px] hover:bg-blue-50 transition duration-300 hover:shadow-md"
                  onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                  aria-label="Select subject filter"
                  aria-expanded={showSubjectDropdown}
                >
                  <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                  {selectedSubject?.label || 'Subject'}
                  <FaChevronDown
                    className={`h-4 sm:h-5 w-4 sm:w-5 text-blue-600 transition-transform duration-200 ${showSubjectDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
                {showSubjectDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white border border-blue-200 rounded-lg shadow-xl z-20 overflow-hidden animate-slide-down">
                    <button
                      className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${!selectedSubject ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-blue-50'}`}
                      onClick={() => {
                        setSelectedSubject(null);
                        setShowSubjectDropdown(false);
                      }}
                    >
                      <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                      All Subjects
                    </button>
                    {subjectOptionsList.map((opt) => (
                      <button
                        key={opt.value}
                        className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${selectedSubject?.value === opt.value ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-blue-50'}`}
                        onClick={() => {
                          setSelectedSubject(opt);
                          setShowSubjectDropdown(false);
                        }}
                      >
                        <FaBook className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div ref={classDropdownRef} className="relative w-full sm:w-auto">
                <button
                  className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-gray-50 border border-blue-300 rounded-md text-sm sm:text-base text-gray-700 w-full sm:min-w-[140px] hover:bg-blue-50 transition duration-300 hover:shadow-md"
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  aria-label="Select class filter"
                  aria-expanded={showClassDropdown}
                >
                  <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                  {selectedClass?.label || 'Class'}
                  <FaChevronDown
                    className={`h-4 sm:h-5 w-4 sm:w-5 text-blue-600 transition-transform duration-200 ${showClassDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
                {showClassDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white border border-blue-200 rounded-lg shadow-xl z-20 overflow-hidden animate-slide-down">
                    <button
                      className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${!selectedClass ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-blue-50'}`}
                      onClick={() => {
                        setSelectedClass(null);
                        setShowClassDropdown(false);
                      }}
                    >
                      <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                      All Classes
                    </button>
                    {classOptionsList.map((opt) => (
                      <button
                        key={opt.value}
                        className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${selectedClass?.value === opt.value ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-blue-50'}`}
                        onClick={() => {
                          setSelectedClass(opt);
                          setShowClassDropdown(false);
                        }}
                      >
                        <FaUsers className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="sm:hidden mb-4">
            <div ref={filterMenuRef} className="relative">
              <Button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 w-full transition-transform duration-200 hover:scale-105"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                aria-label="Toggle filter menu"
                aria-expanded={showFilterMenu}
              >
                <FaFilter className="h-4 sm:h-5 w-4 sm:w-5" />
                Filters
              </Button>
              {showFilterMenu && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-blue-200 rounded-lg shadow-xl z-20 overflow-hidden animate-slide-down">
                  {[
                    { status: 'all', label: 'All', icon: FaFilter },
                    { status: 'pending', label: 'Pending', icon: FaFileAlt },
                    { status: 'graded', label: 'Graded', icon: FaCheckCircle },
                  ].map(({ status, label, icon: Icon }) => (
                    <Button
                      key={status}
                      variant={filterStatus === status ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setFilterStatus(status);
                        setShowFilterMenu(false);
                      }}
                      className={`flex items-center gap-2 w-full justify-start px-3 sm:px-4 py-2 text-sm sm:text-base ${filterStatus === status ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-blue-300 text-blue-600 hover:bg-blue-50'} rounded-none transition-all duration-200`}
                      aria-label={`Filter by ${label}`}
                    >
                      <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center py-12 sm:py-16 min-h-[40vh]">
                <FaSpinner className="h-10 sm:h-12 w-10 sm:w-12 text-blue-600 animate-spin" aria-hidden="true" />
              </div>
            ) : error ? (
              <Card className="bg-red-50 border-red-200 w-full max-w-3xl mx-auto animate-fade-in">
                <div className="p-6 sm:p-8 text-center">
                  <div className="text-red-700 text-xl sm:text-2xl mb-4">{error}</div>
                  <Button
                    onClick={() => navigate('/login')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 sm:px-6 py-2 transition-transform duration-200 hover:scale-105"
                  >
                    Go to Login
                  </Button>
                </div>
              </Card>
            ) : Object.keys(groupedSubmissions).length === 0 ? (
              <Card className="bg-gray-50 border-blue-200 w-full max-w-3xl mx-auto animate-fade-in">
                <div className="p-6 sm:p-8 text-center">
                  <div className="text-4xl sm:text-5xl mb-4">📝</div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">No Submissions Found</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-6">
                    {searchTerm || selectedExam || filterStatus !== 'all' || selectedSubject || selectedClass
                      ? 'Try adjusting your search or filter settings.'
                      : 'There are no student submissions yet.'}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6 sm:space-y-8 animate-fade-in">
                {Object.entries(groupedSubmissions)
                  .slice(0, visibleSubmissions)
                  .map(([examId, { exam, submissions }]) => (
                    <div key={examId} className="bg-gray-50 border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md">
                      <Link to={`/teacher/exams/${examId}/results`} className="block mb-4">
                        <ExamCard
                          title={exam.title || 'Untitled Exam'}
                          subject={exam.subject?.name || 'N/A'}
                          classCode={
                            Array.isArray(exam.classes) && exam.classes.length > 0
                              ? exam.classes
                                .map((c) => c.className || `${c.level}${c.trade?.code || ''}`)
                                .join(', ')
                              : 'No class assigned'
                          }
                          description={`${submissions.length} submissions - ${submissions.filter((s) => s.status === 'pending').length} pending, ${submissions.filter((s) => s.status === 'graded').length} graded`}
                          status={submissions.some((s) => s.status === 'pending') ? 'active' : 'completed'}
                          statusBadge={
                            <span
                              className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium ${submissions.some((s) => s.status === 'pending')
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                                }`}
                            >
                              {submissions.some((s) => s.status === 'pending') ? 'Pending' : 'Graded'}
                            </span>
                          }
                          startTime={
                            exam.schedule?.start
                              ? new Date(exam.schedule.start).toLocaleString('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                              : 'N/A'
                          }
                          endTime={
                            exam.schedule?.start && exam.schedule?.duration
                              ? new Date(
                                new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000
                              ).toLocaleString('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                              : 'N/A'
                          }
                          questions={exam.questions?.length || 0}
                          totalPoints={exam.totalPoints || 0}
                          progress={
                            Math.round(
                              (submissions.filter((s) => s.status === 'graded').length / submissions.length) * 100
                            ) || 0
                          }
                          className="m-2 sm:m-4 p-2 sm:p-4"
                        />
                      </Link>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 m-2 sm:m-4">
                        {submissions.map((submission) => (
                          <Card
                            key={submission._id}
                            className="bg-white border-blue-200 hover:shadow-lg transition-all duration-300"
                          >
                            <div className="p-4 sm:p-6">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium text-sm sm:text-base text-gray-900">
                                    {submission.student?.firstName || 'Unknown'} {submission.student?.lastName || 'Student'}
                                  </h3>
                                  <p className="text-gray-600 text-xs sm:text-sm">
                                    {submission.student?.registrationNumber || 'N/A'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {submission.status === 'pending' ? (
                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800">
                                      Pending Review
                                    </span>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                                        Graded
                                      </span>
                                      <p className="text-xs sm:text-sm font-medium mt-1 text-gray-900">
                                        {submission.score || 0}/{submission.totalPoints || 0} (
                                        {submission.totalPoints
                                          ? Math.round((submission.score / submission.totalPoints) * 100)
                                          : 0}
                                        %)
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <p className="text-xs sm:text-sm text-gray-500">
                                  Submitted:{' '}
                                  {submission.submittedAt
                                    ? new Date(submission.submittedAt).toLocaleString('en-US', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })
                                    : 'N/A'}
                                </p>
                                <Button
                                  onClick={() => navigate(`/teacher/submissions/${submission._id}/view`)}
                                  className={`${submission.status === 'pending'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                                    } rounded-md px-3 sm:px-4 py-1 text-xs sm:text-sm font-medium transform hover:scale-105 transition duration-300`}
                                >
                                  {submission.status === 'pending' ? 'Review & Grade' : 'View Details'}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                {totalSubmissions > visibleSubmissions && (
                  <div className="col-span-full text-center mt-4">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm sm:text-base transition-transform duration-200 hover:scale-105"
                      onClick={() => setVisibleSubmissions((prev) => prev + 10)}
                      aria-label="Show more submissions"
                    >
                      Show More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="hidden sm:block w-full sm:w-48">
            <div className="sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <FaFilter className="h-5 w-5 text-blue-600 animate-pulse" />
                <h3 className="text-base sm:text-lg font-semibold text-blue-600">Filters</h3>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { status: 'all', label: 'All', icon: FaFilter },
                  { status: 'pending', label: 'Pending', icon: FaFileAlt },
                  { status: 'graded', label: 'Graded', icon: FaCheckCircle },
                ].map(({ status, label, icon: Icon }) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                    className={`flex items-center gap-2 w-full justify-start px-3 sm:px-4 py-2 text-sm sm:text-base ${filterStatus === status
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                      } rounded-md transition-all duration-200 hover:shadow-md`}
                    aria-label={`Filter by ${label}`}
                  >
                    <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        .font-roboto {
          font-family: 'Roboto', sans-serif;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Layout>
  );
};

export default SubmissionsListPage;