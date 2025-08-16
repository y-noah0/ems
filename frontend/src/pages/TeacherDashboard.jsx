import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import {
  FaBook,
  FaPlus,
  FaCalendar,
  FaPlayCircle,
  FaCheckCircle,
  FaFileAlt,
  FaSpinner,
  FaSearch,
  FaArrowRight,
  FaChevronDown,
} from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PerformanceChart from '../components/ui/perfomanceChart';
import examService from '../services/examService';

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionVisibility, setSectionVisibility] = useState({
    draft: false,
    scheduled: false,
    active: false,
    completed: false,
  });

  useEffect(() => {
    const fetchExams = async () => {
      if (!currentUser?.school) {
        toast.error('No school associated with your account. Please log in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const examsData = await examService.getTeacherExams(currentUser.school);
        setExams(Array.isArray(examsData) ? examsData : []);
      } catch (error) {
        console.error('Error fetching exams:', error);
        toast.error(error.message || 'Failed to load exams');
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [currentUser]);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        searchTerm === '' ||
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exam.subject?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [exams, searchTerm]);

  const groupedExams = useMemo(
    () => ({
      draft: filteredExams.filter((exam) => exam.status === 'draft'),
      scheduled: filteredExams.filter((exam) => exam.status === 'scheduled'),
      active: filteredExams.filter((exam) => exam.status === 'active'),
      completed: filteredExams.filter((exam) => exam.status === 'completed'),
    }),
    [filteredExams]
  );

  const toggleSection = (section) => {
    setSectionVisibility((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
          
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back,</h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600">
                 {currentUser?.fullName || 'Teacher'}
              </p>

          </div>
          <Button
            as={Link}
            to="/teacher/exams/create"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 sm:px-6 py-2 shadow-md focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            aria-label="Create new exam"
            size='sm'
          >
            <FaPlus className="h-4 w-4" /> Exam
          </Button>
        </div>

        {/* Performance Chart */}
        <PerformanceChart />
        <br />

        
      </div>
    </Layout>
  );
};

export default TeacherDashboard;
