import React from 'react';
import Layout from '../layout/Layout';
import TeacherManagement from './Teachers';

const TeacherPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Layout>
        <TeacherManagement />
      </Layout>
    </div>
  );
};

export default TeacherPage;