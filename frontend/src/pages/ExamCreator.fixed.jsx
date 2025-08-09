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
              subjectId: subjectsData[0]._id
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
              classId: classesData[0]._id
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
        console.error('Error in fetchData:', error);
      }
    };
    
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
  };
  
  const handleSubmit = async (e) => {
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
      
      console.log('Submitting exam data:', formData);
      
      // Save exam as draft
      const examData = await examService.createExam({
        ...formData,
        status: 'draft'
      });
      
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
}

  // Rest of your component...
