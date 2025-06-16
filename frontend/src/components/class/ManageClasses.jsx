import React, { useState } from 'react';
import DynamicTable from './DynamicTable';
import { FiPlus } from 'react-icons/fi';

const ManageClasses = () => {
  // Sample data with more items to demonstrate scrolling
  const [classesData, setClassesData] = useState([
    { id: 1, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 2, className: 'L4MEN', rank: 'No. 2', students: '21 students' },
    { id: 3, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 4, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 5, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 6, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 7, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 8, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 9, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 10, className: 'L490D', rank: 'No. 1', students: '22 students' },
    { id: 11, className: 'L470D', rank: 'No. 2', students: '20 students' },
    { id: 12, className: 'L460D', rank: 'No. 3', students: '19 students' },
    { id: 13, className: 'L450D', rank: 'No. 1', students: '23 students' },
    { id: 14, className: 'L440D', rank: 'No. 2', students: '20 students' },
  ]);

  // Define columns for the classes table
  const classesColumns = [
    { key: 'className', title: 'Class' },
    { key: 'rank', title: 'Rank' },
    { key: 'students', title: 'Students' }
  ];

  // Handler functions
  const handleEdit = (item) => {
    console.log('Edit class:', item);
    // Add your edit logic here
  };

  const handleDelete = (item) => {
    console.log('Delete class:', item);
    // Add your delete logic here
    if (window.confirm(`Are you sure you want to delete ${item.className}?`)) {
      setClassesData(classesData.filter(cls => cls.id !== item.id));
    }
  };

  const handleAddClass = () => {
    console.log('Add new class');
    // Add your logic to open a modal or navigate to add class form
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-800">Manage Classes</h1>
        <button 
          onClick={handleAddClass}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
        >
          <FiPlus size={18} />
          <span>Add class</span>
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <DynamicTable
          data={classesData}
          columns={classesColumns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          containerHeight="350px" // Set a fixed height for the scrollable area
        />
      </div>
    </div>
  );
};

export default ManageClasses;