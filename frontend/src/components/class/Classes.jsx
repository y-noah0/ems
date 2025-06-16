import React, { useState } from 'react';
import DynamicTable from './DynamicTable';

const Classes = () => {
  // Sample data that matches your screenshot, but with more items to demonstrate scrolling
  const [classesData, setClassesData] = useState([
    { id: 1, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 2, className: 'L4MEN', rank: 'No. 2', students: '21 students' },
    { id: 3, className: 'L490D', rank: 'No. 3', students: '21 students' },
    { id: 4, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 5, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 6, className: 'L490D', rank: 'No. 3', students: '21 students' },
    { id: 7, className: 'L475D', rank: 'No. 1', students: '22 students' },
    { id: 8, className: 'L460D', rank: 'No. 2', students: '20 students' },
    { id: 9, className: 'L450D', rank: 'No. 3', students: '19 students' },
    { id: 10, className: 'L420D', rank: 'No. 1', students: '23 students' },
    { id: 11, className: 'L410D', rank: 'No. 2', students: '20 students' },
    { id: 12, className: 'L430D', rank: 'No. 3', students: '22 students' },
  ]);

  // Define columns for the classes table
  const classesColumns = [
    { key: 'className', title: 'Class' },
    { key: 'rank', title: 'Rank' },
    { key: 'students', title: 'Students' }
  ];

  // Handler functions
  const handleEdit = (item) => {
    console.log('Edit item:', item);
    // Add your edit logic here
  };

  const handleDelete = (item) => {
    console.log('Delete item:', item);
    // Add your delete logic here, or show a confirmation dialog
    if (window.confirm(`Are you sure you want to delete ${item.className}?`)) {
      setClassesData(classesData.filter(cls => cls.id !== item.id));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Classes</h1>
      
      {/* Card container for the table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <DynamicTable
          data={classesData}
          columns={classesColumns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          containerHeight="350px" // Set the height of the scrollable container
        />
      </div>
    </div>
  );
};

export default Classes;