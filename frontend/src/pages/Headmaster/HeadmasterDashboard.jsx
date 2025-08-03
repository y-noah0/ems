import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import adminService from '../../services/adminService';
import systemAdminService from '../../services/systemAdminService';
import WelcomeSection from '../../components/dashboard/WelcomeSection';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import StatsCards from '../../components/dashboard/StatsCards';

export default function HeadmasterDashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ classCount: 0, teacherCount: 0, studentCount: 0, examCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Classes in this school
        const classesData = await adminService.getAllClasses();
        // Teachers in this school
        const staffResponse = await systemAdminService.getAllStaff();
        const staff = staffResponse.staff || [];
        const teachers = staff.filter(u => u.role === 'teacher');
        // Student count by class
        let totalStudents = 0;
        for (const cls of classesData) {
          const students = await adminService.getStudentsByClass(cls._id);
          totalStudents += students.length;
        }
        setStats({
          classCount: classesData.length,
          teacherCount: teachers.length,
          studentCount: totalStudents,
          examCount: 0
        });
      } catch {
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
        </>
      )}
    </Layout>
  );
}
