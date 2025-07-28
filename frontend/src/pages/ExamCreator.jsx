import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import examService from '../services/examService';
import adminService from '../services/adminService';

const ExamCreator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  // Exam form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    classId: '',
    type: 'midterm',
    duration: 60, // minutes
    startTime: '',
    totalPoints: 100,
    passingPercentage: 50,
    questions: []
  });
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch subjects
        try {
          const subjectsData = await examService.getTeacherSubjects();
          setSubjects(subjectsData);
          if (subjectsData.length > 0) {
            setFormData(prev => ({
              ...prev,
              subjectId: subjectsData[0]._id.toString()
            }));
          } else {
            // No subjects found
            setError('No subjects are assigned to you. Please contact your dean to assign subjects.');
          }
        } catch (subjError) {
          console.error('Error fetching subjects:', subjError);
          setError('Failed to load subjects. Please try again later or contact your dean.');
        }        // Fetch classes
        try {
          const classesData = await adminService.getTeacherClasses();
          setClasses(classesData);
          if (classesData.length > 0) {
            setFormData(prev => ({
              ...prev,
              classId: classesData[0]._id.toString()
            }));
          } else {
            setError(prevError =>
              prevError ? `${prevError} No classes are available.` : 'No classes are available. Please contact your dean.'
            );
          }
        } catch (classError) {
          console.error('Error fetching classes:', classError);
          setError(prevError =>
            prevError ? `${prevError} Failed to load classes.` : 'Failed to load classes. Please try again later.'
          );
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setError('Failed to load subjects');
      }
    }

    fetchData();
  }, []);
  const handleChange = (e) => {
    const { name, value } = e.target;

    // If the field is an ID, ensure it's properly formatted
    if (name === 'subjectId' || name === 'classId') {
      setFormData(prev => ({
        ...prev,
        [name]: value.toString().replace(/^"+|"+$/g, '') // Remove any extra quotes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(), // Temporary ID for UI purposes
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
  }; const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form data
      if (!formData.title.trim()) {
        throw new Error('Exam title is required');
      }
      if (!formData.subjectId) {
        throw new Error('Please select a subject');
      }
      if (!formData.classId) {
        throw new Error('Please select a class');
      }

      // Prepare data - ensure IDs are properly formatted, no extra quotes
      const examDataToSubmit = {
        ...formData,
        subjectId: formData.subjectId.toString().replace(/^"+|"+$/g, ''),
        classIds: [formData.classId.toString().replace(/^"+|"+$/g, '')], // <-- Fix here
        // Remove classId, use classIds array
        schedule: formData.startTime ? {
          start: new Date(formData.startTime),
          duration: parseInt(formData.duration)
        } : null,
        status: 'draft'
      };
      delete examDataToSubmit.classId; // Remove classId from payload

      console.log('Submitting exam data:', examDataToSubmit);

      // Save exam as draft
      const examData = await examService.createExam(examDataToSubmit);

      setSuccess('Exam created successfully!');
      setTimeout(() => {
        navigate(`/teacher/exams/${examData._id}/edit`);
      }, 2000);
    } catch (error) {
      console.error('Error creating exam:', error);
      setError(error.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
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
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter exam description"
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
                  {subjects.length === 0 ? (
                    <option value="" disabled>No subjects available</option>
                  ) : (
                    subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {classes.length === 0 ? (
                    <option value="" disabled>No classes available</option>
                  ) : (
                    classes.map(cls => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name || `${cls.level}${cls.trade}`}
                      </option>
                    ))
                  )}
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
                  <option value="midterm">Midterm Exam</option>
                  <option value="final">Final Exam</option>
                  <option value="quiz">Quiz</option>
                  <option value="practice">Practice Test</option>
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
                  min={1}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/teacher/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Exam'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </Layout>
  );
};

export default ExamCreator;
