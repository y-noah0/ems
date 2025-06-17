import React from 'react';

const ClassPerformance = ({ students = [], onViewClick = () => {} }) => {
  // Default students if none provided
  const displayedStudents = students.length > 0 ? students : [
    { name: 'Mukabafuri Immacule', marks: '82%' },
    { name: 'Mukabafuri Immacule', marks: '80%' },
    { name: 'Nsengiyumva guy', marks: '79.2%' },
    { name: 'Muremyi Jerry', marks: '40%' }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100 bg-white bg-opacity-90 shadow-lg rounded-t-xl">
        <h3 className="text-lg font-semibold text-gray-900">Class Performance</h3>
        <button 
          onClick={onViewClick}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View All
        </button>
      </div>
      {/* Student List */}
      <div className="divide-y divide-gray-100">
        {/* Table Header */}
        <div className="grid grid-cols-2 px-6 py-3">
          <span className="text-sm font-medium text-gray-500">Student</span>
          <span className="text-sm font-medium text-gray-500 text-right">Marks</span>
        </div>
        
        {/* Student Rows */}
        {displayedStudents.map((student, index) => (
          <div 
            key={index} 
            className="grid grid-cols-2 px-6 py-3 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-sm font-medium text-gray-900 truncate pr-2">
              {student.name}
            </span>
            <span className={`text-sm font-medium text-right ${
              parseFloat(student.marks) < 50 ? 'text-red-600' : 
              parseFloat(student.marks) < 75 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {student.marks}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 text-right">
        <span className="text-xs text-gray-500">
          Showing {displayedStudents.length} of {displayedStudents.length} students
        </span>
      </div>
    </div>
  );
};

export default ClassPerformance;