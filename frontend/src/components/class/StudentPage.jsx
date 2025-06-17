import React from 'react';
import Layout from '../layout/Layout';
import StudentManagement from './Students';

const StudentPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Layout>
        <StudentManagement />
      </Layout>
    </div>
  );
};

export default StudentPage;