import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../layout/Layout';
import WelcomeSection from './WelcomeSection';
import StatsCards from './StatsCards';
import RiskZones from './RiskZones';
import ClassPerformance from './ClassPerformance';
import ExamsSection from './ExamsSection';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';
import adminService from '../../services/adminService';

const DeanDashboard = () => {
  const { currentUser } = useAuth();

  // Sidebar links based on role
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
        const classesData = await adminService.getAllClasses(currentUser.school);

        // Fetch teachers
        const teachersData = await adminService.getAllTeachers();
        
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

  return (
    <Layout>
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <WelcomeSection currentUser={currentUser} />
          <StatsCards stats={stats} />

          <div className="flex flex-col gap-6 px-2 sm:px-4 lg:flex-row">
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 gap-6 mb-6">
                <RiskZones />
              </div>
              <ClassPerformance />
            </div>
            <div className="w-full flex-shrink-0 lg:w-[300px] xl:w-[350px] 2xl:w-[400px] mt-6 lg:mt-0">
                
                <ExamsSection />
              
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default DeanDashboard;