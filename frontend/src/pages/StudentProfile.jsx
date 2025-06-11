import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import adminService from '../services/adminService';
import { useAuth } from '../context/AuthContext';

const StudentProfile = () => {
  const { currentUser } = useAuth();
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        // If we're on the student's own profile (no studentId), use the current user data
        if (!studentId && currentUser?.role === 'student') {
          setStudent(currentUser);
          setLoading(false);
          return;
        }
        
        // Otherwise fetch the student data from API
        const studentData = await adminService.getStudentById(studentId || currentUser?._id);
        setStudent(studentData);
      } catch (error) {
        console.error('Error fetching student data:', error);
        setError('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId, currentUser]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          Student data could not be loaded. Please try again later.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card title="Personal Information">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                <p className="mt-1 text-base text-gray-900">{student.fullName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 text-base text-gray-900">{student.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Registration Number</h3>
                <p className="mt-1 text-base text-gray-900">{student.registrationNumber}</p>
              </div>
              {student.class && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Class</h3>
                  <p className="mt-1 text-base text-gray-900">
                    {student.class.level}{student.class.trade} - Term {student.class.term} ({student.class.year})
                  </p>
                </div>
              )}
            </div>
          </Card>        </div>

        <div className="md:col-span-2">
          <Card title="Academic Information">
            <div className="mb-4">
              {currentUser?.role === 'student' ? (
                <Button 
                  as={Link} 
                  to="/student/results"
                  variant="primary"
                >
                  View My Results
                </Button>
              ) : (
                <Button 
                  as={Link} 
                  to={`/dean/students/${student._id}/results`}
                  variant="primary"
                >
                  View Results
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Recent Exams</h3>
                <div className="bg-gray-50 p-4 rounded-md text-center">
                  <p className="text-gray-500">No exam data available yet</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Attendance Summary</h3>
                <div className="bg-gray-50 p-4 rounded-md text-center">
                  <p className="text-gray-500">No attendance data available yet</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default StudentProfile;
