import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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

  const handleEdit = (subject) => {
    setFormData({
      name: subject.name,
      classId: subject.class,
      teacherId: subject.teacher?._id || '',
      description: subject.description || '',
      credits: subject.credits || 1
    });
    setEditingSubject(subject);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');
  };

  const handleAssignTeacher = async (subjectId, teacherId) => {
    setLoading(true);
    setError('');
    try {
      await adminService.assignTeacherToSubject(subjectId, teacherId);
      setFormSuccess(`Teacher assigned successfully!`);
      setAssigningTeacher(null);
      await fetchSubjects();
    } catch (error) {
      console.error('Error assigning teacher:', error);
      setError(error.message || 'Failed to assign teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeacher = async (subjectId) => {
    setLoading(true);
    setError('');
    try {
      // Use empty string to indicate removal of teacher
      await adminService.assignTeacherToSubject(subjectId, '');
      setFormSuccess(`Teacher removed successfully!`);
      await fetchSubjects();
    } catch (error) {
      console.error('Error removing teacher:', error);
      setError(error.message || 'Failed to remove teacher');
    } finally {
      setLoading(false);
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
                      {cls.level}{cls.trade} - Term {cls.term} ({cls.year})
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
                {cls.level}{cls.trade} - Term {cls.term} ({cls.year})
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credits
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map((subject) => (
                  <tr key={subject._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subject.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.credits || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assigningTeacher === subject._id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            className="px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignTeacher(subject._id, e.target.value);
                              }
                            }}
                          >
                            <option value="">Select Teacher</option>
                            {teachers.map((teacher) => (
                              <option key={teacher._id} value={teacher._id}>
                                {teacher.fullName || `${teacher.firstName} ${teacher.lastName}`}
                              </option>
                            ))}
                          </select>
                          <Button 
                            variant="secondary" 
                            size="xs" 
                            onClick={() => setAssigningTeacher(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          {subject.teacher ? (
                            <div className="flex items-center space-x-2">
                              <span>{subject.teacher.fullName || `${subject.teacher.firstName} ${subject.teacher.lastName}`}</span>
                              <Button 
                                variant="danger" 
                                size="xs" 
                                onClick={() => handleRemoveTeacher(subject._id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="primary" 
                              size="xs" 
                              onClick={() => setAssigningTeacher(subject._id)}
                            >
                              Assign Teacher
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(subject)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default SubjectsManagement;
