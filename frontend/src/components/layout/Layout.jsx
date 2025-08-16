import React from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }) => {
  const { currentUser } = useAuth();

  return (
    <div className="flex h-screen bg-white">
      <Sidebar userRole={currentUser?.role || 'student'} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader currentUser={currentUser} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;