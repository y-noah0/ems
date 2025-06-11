import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import adminService from '../services/adminService';

const ClassView = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('students');

  useEffect(() => {
    const fetchClassData = async () => {
      try {
        setLoading(true);
        
        // Fetch all classes to find the class by ID
        const classesData = await adminService.getAllClasses();
        const currentClass = classesData.find(cls => cls._id === classId);
        
        if (!currentClass) {
          setError('Class not found');
          setLoading(false);
          return;
        }
        
        setClassData(currentClass);
        
        // Fetch students for this class
        const studentsData = await adminService.getStudentsByClass(classId);
        setStudents(studentsData);
        
        // Fetch subjects for this class
        const subjectsData = await adminService.getSubjectsByClass(classId);
        setSubjects(subjectsData);
        
      } catch (err) {
        console.error('Error fetching class data:', err);
        setError('Failed to load class information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassData();
  }, [classId]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {loading ? 'Loading...' : classData ? `Class: ${classData.level}${classData.trade}` : 'Class Not Found'}
        </h1>
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : classData ? (
        <>
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row justify-between">
              <div className="mb-4 md:mb-0">
                <h2 className="text-lg font-semibold mb-2">Class Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Level</p>
                    <p className="font-medium">{classData.level}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Trade</p>
                    <p className="font-medium">{classData.trade}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Year</p>
                    <p className="font-medium">{classData.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Term</p>
                    <p className="font-medium">{classData.term}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-blue-100 text-blue-800 p-4 rounded-lg">
                  <p className="text-sm font-medium">Students</p>
                  <p className="text-2xl font-bold">{students.length}</p>
                </div>
                <div className="bg-purple-100 text-purple-800 p-4 rounded-lg">
                  <p className="text-sm font-medium">Subjects</p>
                  <p className="text-2xl font-bold">{subjects.length}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="mb-6 flex border-b">
            <button
              className={`py-2 px-4 ${selectedTab === 'students' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setSelectedTab('students')}
            >
              Students ({students.length})
            </button>
            <button
              className={`py-2 px-4 ${selectedTab === 'subjects' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setSelectedTab('subjects')}
            >
              Subjects ({subjects.length})
            </button>
          </div>

          {selectedTab === 'students' && (
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Students List</h2>
                <Button as="a" href="/dean/import-students" variant="primary" size="sm">
                  Import Students
                </Button>
              </div>

              {students.length === 0 ? (
                <p className="text-gray-500">No students found in this class.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration Number
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.fullName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.registrationNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Button variant="secondary" size="sm">
                              View Results
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {selectedTab === 'subjects' && (
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Subjects List</h2>
                <Button onClick={() => navigate(`/dean/subjects?class=${classId}`)} variant="primary" size="sm">
                  Add Subject
                </Button>
              </div>

              {subjects.length === 0 ? (
                <p className="text-gray-500">No subjects found for this class.</p>
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
                            {subject.teacher ? subject.teacher.fullName : 'Not assigned'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      ) : null}
    </Layout>
  );
};

export default ClassView;
