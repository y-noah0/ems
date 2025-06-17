import React from 'react';
import ManageClasses from './ManageClasses';
import Layout from '../layout/Layout';

const ClassesPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Layout>
        <ManageClasses />
      </Layout>
    </div>
  );
};

export default ClassesPage;