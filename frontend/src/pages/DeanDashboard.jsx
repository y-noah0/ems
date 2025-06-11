import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import adminService from '../services/adminService';

const DeanDashboard = () => {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({
    classCount: 0,
    teacherCount: 0,
    studentCount: 0,
    examCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch classes
        const classesData = await adminService.getAllClasses();
        setClasses(classesData);

        // Fetch teachers
        const teachersData = await adminService.getAllTeachers();
        setTeachers(teachersData);
        
        // Calculate student count by fetching students for each class
        let totalStudents = 0;
        for (const classItem of classesData) {
          const students = await adminService.getStudentsByClass(classItem._id);
          totalStudents += students.length;
        }

        // Set stats
        setStats({
          classCount: classesData.length,
          teacherCount: teachersData.length,
          studentCount: totalStudents,
          examCount: 0 // Will be updated with a proper API call in the future
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const renderCurrentTerm = () => {
    const now = new Date();
    const year = now.getFullYear();
    // Determine current term based on month
    const month = now.getMonth() + 1;
    let term;
    if (month >= 1 && month <= 4) term = 1;
    else if (month >= 5 && month <= 8) term = 2;
    else term = 3;
    
    return { year, term };
  };

  const { year, term } = renderCurrentTerm();

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dean Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {currentUser?.fullName}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      ) : (
        <>
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-gray-600 text-sm font-medium">Classes</h2>
                  <p className="text-2xl font-semibold text-gray-800">{stats.classCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-gray-600 text-sm font-medium">Teachers</h2>
                  <p className="text-2xl font-semibold text-gray-800">{stats.teacherCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="rounded-full bg-yellow-100 p-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>                <div className="ml-4">
                  <h2 className="text-gray-600 text-sm font-medium">Students</h2>
                  <p className="text-2xl font-semibold text-gray-800">{stats.studentCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="rounded-full bg-purple-100 p-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>                <div className="ml-4">
                  <h2 className="text-gray-600 text-sm font-medium">Exams</h2>
                  <p className="text-2xl font-semibold text-gray-800">{stats.examCount || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Classes */}
            <Card title="Recent Classes">
              {classes.length === 0 ? (
                <p className="text-gray-500">No classes available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {classes.slice(0, 5).map((cls) => (
                        <tr key={cls._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {cls.level}{cls.trade}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cls.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cls.term}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link 
                              to={`/dean/classes/${cls._id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button as={Link} to="/dean/classes" variant="secondary" size="sm">
                  View All Classes
                </Button>
              </div>
            </Card>

            {/* Recent Teachers */}
            <Card title="Recent Teachers">
              {teachers.length === 0 ? (
                <p className="text-gray-500">No teachers available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
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
                      {teachers.slice(0, 5).map((teacher) => (
                        <tr key={teacher._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {teacher.fullName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {teacher.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link 
                              to={`/dean/teachers/${teacher._id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button as={Link} to="/dean/teachers" variant="secondary" size="sm">
                  View All Teachers
                </Button>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium mb-2">Manage Classes</h3>
                  <p className="text-sm text-gray-600 mb-3">Create, edit or delete academic classes</p>
                  <Button as={Link} to="/dean/classes" variant="primary" size="sm">
                    Manage Classes
                  </Button>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium mb-2">Manage Subjects</h3>
                  <p className="text-sm text-gray-600 mb-3">Create subjects and assign teachers</p>
                  <Button as={Link} to="/dean/subjects" variant="primary" size="sm">
                    Manage Subjects
                  </Button>
                </div>                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium mb-2">Manage Users</h3>
                  <p className="text-sm text-gray-600 mb-3">Manage teachers and staff</p>
                  <Button as={Link} to="/dean/users" variant="primary" size="sm">
                    Manage Users
                  </Button>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium mb-2">Manage Students</h3>
                  <p className="text-sm text-gray-600 mb-3">Add, edit or manage students</p>
                  <Button as={Link} to="/dean/students" variant="primary" size="sm">
                    Manage Students
                  </Button>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium mb-2">Import Students</h3>
                  <p className="text-sm text-gray-600 mb-3">Bulk import students via CSV</p>
                  <Button as={Link} to="/dean/import-students" variant="primary" size="sm">
                    Import Students
                  </Button>
                </div>
              </div>
            </Card>

            {/* Current Term Overview */}
            <Card title={`Current Term: Term ${term}, ${year}`}>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  Manage the current academic term, view statistics and reports.
                </p>
                <div className="space-y-2">
                  <Button as={Link} to="/dean/reports/term-summary" variant="secondary" size="sm" className="mr-2">
                    View Term Summary
                  </Button>
                  <Button as={Link} to="/dean/reports/performance" variant="secondary" size="sm">
                    Performance Reports
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
};

export default DeanDashboard;
