import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import DynamicTable from '../components/class/DynamicTable';
import adminService from '../services/adminService';

const SubjectsManagement = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [assigningTeacher, setAssigningTeacher] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    teacherId: '',
    description: '',
    credits: 1
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const classesData = await adminService.getAllClasses();
        setClasses(classesData);
        
        const teachersData = await adminService.getAllTeachers();
        setTeachers(teachersData);

        if (classesData.length > 0) {
          setSelectedClass(classesData[0]._id);
          setFormData(prev => ({ ...prev, classId: classesData[0]._id }));
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load initial data');
      }
    };

    fetchData();
  }, []);
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const subjectsData = await adminService.getSubjectsByClass(selectedClass);
      setSubjects(subjectsData);
      setError(''); // Clear any previous errors on success
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);
  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
    }
  }, [selectedClass, fetchSubjects]);
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'credits' ? parseInt(value, 10) : value
    }));
  };

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setFormData((prev) => ({ ...prev, classId: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    try {
      if (editingSubject) {
        // Update subject functionality will be added in the future
        setFormSuccess('Subject updated successfully!');
      } else {
        await adminService.createSubject(formData);
        setFormSuccess('Subject created successfully!');
      }
      
      // Reset form and refresh subjects
      setFormData({
        name: '',
        classId: selectedClass,
        teacherId: '',
        description: '',
        credits: 1
      });
      setEditingSubject(null);
      setShowForm(false);
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      setFormError(error.message || 'Failed to save subject');
    }
  };

  // Subject table columns
  const subjectColumns = [
    { 
      key: 'name', 
      title: 'Subject Name',
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {value}
        </span>
      )
    },
    { 
      key: 'credits', 
      title: 'Credits',
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value || '-'}
        </span>
      )
    },
    { 
      key: 'teacher', 
      title: 'Teacher',
      render: (value, item) => {
        if (assigningTeacher === item._id) {
          return (
            <div className="flex items-center space-x-2">
              <select
                value={item.teacherId || ''}
                onChange={(e) => handleTeacherAssignment(item._id, e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setAssigningTeacher(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          );
        }
        return (
          <span className="text-sm text-gray-500">
            {item.teacher ? item.teacher.fullName : 'Not assigned'}
          </span>
        );
      }
    }
  ];

  // Action handlers
  const handleEdit = (subject) => {
    console.log('Edit subject:', subject);
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      classId: subject.classId || selectedClass,
      teacherId: subject.teacherId || '',
      description: subject.description || '',
      credits: subject.credits || 1
    });
    setShowForm(true);
  };

  const handleDelete = async (subject) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    
    try {
      await adminService.deleteSubject(subject._id);
      await fetchSubjects();
      setFormSuccess('Subject deleted successfully!');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting subject:', error);
      setFormError('Failed to delete subject');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  const handleAssignTeacher = (subject) => {
    setAssigningTeacher(subject._id);
  };

  const handleTeacherAssignment = async (subjectId, teacherId) => {
    try {
      await adminService.assignTeacherToSubject(subjectId, teacherId);
      await fetchSubjects();
      setAssigningTeacher(null);
      setFormSuccess('Teacher assigned successfully!');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error('Error assigning teacher:', error);
      setFormError('Failed to assign teacher');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      classId: selectedClass,
      teacherId: '',
      description: '',
      credits: 1
    });
    setEditingSubject(null);
    setShowForm(false);
    setFormError('');
    setFormSuccess('');
  };

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Subjects</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="primary">
            Add New Subject
          </Button>
        )}
      </div>

      {formSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {formSuccess}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingSubject ? 'Edit Subject' : 'Add New Subject'}
          </h2>
          
          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {formError}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Mathematics"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.level}{cls.trade.code} - Term {cls.term} ({cls.year})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher (Optional)</label>
                <select
                  name="teacherId"
                  value={formData.teacherId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.fullName} ({teacher.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                <Input
                  type="number"
                  name="credits"
                  value={formData.credits}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Subject description (optional)"
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingSubject ? 'Update Subject' : 'Create Subject'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
          <select
            value={selectedClass}
            onChange={handleClassChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.level}{cls.trade.code} - Term {cls.term} ({cls.year})
              </option>
            ))}
          </select>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">Subjects List</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : subjects.length === 0 ? (
          <p className="text-gray-500">No subjects available for this class. Create your first subject!</p>
        ) : (
          <DynamicTable
            data={subjects}
            columns={subjectColumns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showActions={true}
            emptyMessage="No subjects available for this class. Create your first subject!"
            containerWidth="100%"
            containerHeight="auto"
            renderCustomActions={(subject) => (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(subject)}
                  className="text-blue-600 hover:text-blue-900 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleAssignTeacher(subject)}
                  className="text-green-600 hover:text-green-900 transition-colors"
                >
                  Assign Teacher
                </button>
                <button
                  onClick={() => handleDelete(subject)}
                  className="text-red-600 hover:text-red-900 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          />
        )}
      </Card>
    </Layout>
  );
};

export default SubjectsManagement;
