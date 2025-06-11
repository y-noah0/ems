import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import adminService from '../services/adminService';

const StudentManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Form data for adding a single student
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    registrationNumber: '',
    classId: ''
  });

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await adminService.getAllClasses();
        setClasses(classesData);
        
        if (classesData.length > 0) {
          setSelectedClassId(classesData[0]._id);
          setFormData(prev => ({
            ...prev,
            classId: classesData[0]._id
          }));
          
          // Load students from the first class
          const studentsData = await adminService.getStudentsByClass(classesData[0]._id);
          setStudents(studentsData);
        }
      } catch (err) {
        setError('Failed to load classes. Please try again.');
        console.error(err);
      }
    };
    
    fetchClasses();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    setFormData(prev => ({
      ...prev,
      classId
    }));
    
    try {
      setLoading(true);
      const studentsData = await adminService.getStudentsByClass(classId);
      setStudents(studentsData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load students. Please try again.');
      setLoading(false);
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await adminService.createStudent(formData);
      setSuccess('Student added successfully!');
      
      // Clear form
      setFormData({
        fullName: '',
        email: '',
        registrationNumber: '',
        classId: selectedClassId
      });
      
      // Refresh student list
      const updatedStudents = await adminService.getStudentsByClass(selectedClassId);
      setStudents(updatedStudents);
    } catch (err) {
      setError(err.message || 'Failed to add student. Please check the information and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
        <p className="mt-1 text-gray-600">
          Add new students or manage existing ones
        </p>
      </div>
      
      {/* Display success/error messages */}
      {success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 text-green-700">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Student Form */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Student</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <Input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <Input
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This will also be used as the initial password
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    required
                  >
                    <option value="">Select a class</option>
                    {classes.map(classItem => (
                      <option key={classItem._id} value={classItem._id}>
                        {`${classItem.level} ${classItem.trade} Year ${classItem.year} Term ${classItem.term}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Adding...' : 'Add Student'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Card>
        
        {/* Import Students Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Bulk Import Students</h2>
            <p className="text-sm text-gray-600 mb-4">
              Import multiple students at once using a CSV file.
              Format: fullName,email,registrationNumber
            </p>
            
            <Button
              onClick={() => navigate('/import-students')}
              variant="secondary"
              className="w-full"
            >
              Go to Import Page
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Students List */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Students</h2>
          
          <select
            value={selectedClassId}
            onChange={handleClassChange}
            className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {classes.map(classItem => (
              <option key={classItem._id} value={classItem._id}>
                {`${classItem.level} ${classItem.trade} Year ${classItem.year} Term ${classItem.term}`}
              </option>
            ))}
          </select>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : students.length === 0 ? (
          <Card>
            <div className="p-6 text-center text-gray-500">
              No students found in this class
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map(student => (
                    <tr key={student._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.registrationNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-4">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default StudentManagement;
