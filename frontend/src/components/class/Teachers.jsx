import React, { useState } from 'react';
import DynamicTable from './DynamicTable';
import { FiChevronDown, FiPlus } from 'react-icons/fi';

const TeacherManagement = () => {
  // Sample teacher data
  const [teachersData, setTeachersData] = useState([
    { 
      id: 1, 
      fullName: 'Mutisa Mona Lisa', 
      email: 'monalas28@gmail.com', 
      phone: '0788238923', 
      subjects: 3 
    },
    { 
      id: 2, 
      fullName: 'Mutisa Mona Lisa', 
      email: 'monalas28@gmail.com', 
      phone: '0788238923', 
      subjects: 3 
    },
    { 
      id: 3, 
      fullName: 'Mutisa Mona Lisa', 
      email: 'monalas28@gmail.com', 
      phone: '0788238923', 
      subjects: 3 
    },
    { 
      id: 4, 
      fullName: 'Mutisa Mona Lisa', 
      email: 'monalas28@gmail.com', 
      phone: '0788238923', 
      subjects: 3 
    },
    { 
      id: 5, 
      fullName: 'Mutisa Mona Lisa', 
      email: 'monalas28@gmail.com', 
      phone: '0788238923', 
      subjects: 3 
    },
    { 
      id: 6, 
      fullName: 'Mutisa Mona Lisa', 
      email: 'monalas28@gmail.com', 
      phone: '0788238923', 
      subjects: 3 
    },
    { 
      id: 7, 
      fullName: 'Mutisa Mona Lisa', 
      email: 'monalas28@gmail.com', 
      phone: '0788238923', 
      subjects: 3 
    }
  ]);

  // Define columns for the teachers table
  const teacherColumns = [
    { key: 'fullName', title: 'Full student names', width: '30%' },
    { key: 'email', title: 'Email', width: '25%' },
    { key: 'phone', title: 'Phone', width: '20%' },
    { key: 'subjects', title: 'Subjects', width: '10%' }
  ];

  // Currently selected academic year
  const [academicYear, setAcademicYear] = useState('2025-2026');

  // Handler functions
  const handleEdit = (teacher) => {
    console.log('Edit teacher:', teacher);
    // Add your edit logic here
  };

  const handleDelete = (teacher) => {
    console.log('Delete teacher:', teacher);
    // Add your delete logic here
    if (window.confirm(`Are you sure you want to delete ${teacher.fullName}?`)) {
      setTeachersData(teachersData.filter(t => t.id !== teacher.id));
    }
  };

  const handleAddTeacher = () => {
    console.log('Add new teacher');
    // Add your logic to open a modal or navigate to add teacher form
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-800">Teacher Management</h1>
        
        <div className="flex items-center gap-4">
          {/* Academic Year Dropdown */}
          <div className="relative">
            <button className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[140px]">
              {academicYear}
              <FiChevronDown />
            </button>
          </div>
          
          {/* Add Teacher Button */}
          <button 
            onClick={handleAddTeacher}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
          >
            <FiPlus size={18} />
            <span>Teacher</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <DynamicTable
          data={teachersData}
          columns={teacherColumns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          containerHeight="350px"
        />
      </div>
    </div>
  );
};

export default TeacherManagement;