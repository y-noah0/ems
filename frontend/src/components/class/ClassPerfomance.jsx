import React, { useState } from 'react';
import DynamicTable from '../class/DynamicTable';
import { FiChevronDown } from 'react-icons/fi';

const ClassPerformance = () => {
  // Sample performance data
  const [performanceData, setPerformanceData] = useState([
    { 
      id: 1, 
      name: 'Mukamana alexis', 
      assessment1: '87%', 
      assessment2: '82%', 
      test: '89%', 
      exams: '85%',
      total: '84%'
    },
    { 
      id: 2, 
      name: 'Mukamana alexis', 
      assessment1: '87%', 
      assessment2: '82%', 
      test: '89%', 
      exams: '85%',
      total: '84%'
    },
    { 
      id: 3, 
      name: 'Mukamana alexis', 
      assessment1: '87%', 
      assessment2: '82%', 
      test: '89%', 
      exams: '85%',
      total: '84%'
    },
    { 
      id: 4, 
      name: 'Mukamana alexis', 
      assessment1: '87%', 
      assessment2: '82%', 
      test: '89%', 
      exams: '85%',
      total: '84%'
    },
    { 
      id: 5, 
      name: 'Mukamana alexis', 
      assessment1: '87%', 
      assessment2: '82%', 
      test: '89%', 
      exams: '85%',
      total: '84%'
    },
    { 
      id: 6, 
      name: 'Mukamana alexis', 
      assessment1: '87%', 
      assessment2: '82%', 
      test: '89%', 
      exams: '85%',
      total: '84%'
    },
    { 
      id: 7, 
      name: 'Mukamana alexis', 
      assessment1: '87%', 
      assessment2: '82%', 
      test: '89%', 
      exams: '85%',
      total: '84%'
    },
  ]);

  // Define columns for the performance table
  const performanceColumns = [
    { key: 'name', title: 'Names', width: '25%' },
    { key: 'assessment1', title: 'Ass I', width: '12%' },
    { key: 'assessment2', title: 'Ass II', width: '12%' },
    { key: 'test', title: 'Test', width: '12%' },
    { key: 'exams', title: 'Exams', width: '12%' },
    { key: 'total', title: 'Total', width: '12%' },
  ];

  // Currently selected filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [term, setTerm] = useState('Term 1');
  const [classLevel, setClassLevel] = useState('P5 B');

  // View student details handler
  const handleViewDetails = (student) => {
    console.log('View student details:', student);
    // Add navigation logic to student details page
  };

  return (
    <div className="p-6 bg-white">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-800 mb-6">Performance monitor</h1>

        <div className="flex justify-end gap-3 mb-3">
          {/* Academic Year Dropdown */}
          <div className="relative">
            <button className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[140px]">
              {academicYear}
              <FiChevronDown />
            </button>
          </div>
          
          {/* Term Dropdown */}
          <div className="relative">
            <button className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[100px]">
              {term}
              <FiChevronDown />
            </button>
          </div>
          
          {/* Class Dropdown */}
          <div className="relative">
            <button className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[100px]">
              {classLevel}
              <FiChevronDown />
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {/* Modified DynamicTable to fit performance monitor design */}
        <PerformanceDynamicTable
          data={performanceData}
          columns={performanceColumns}
          onView={handleViewDetails}
          containerHeight="350px"
        />
      </div>
    </div>
  );
};

// Custom table component for performance monitor that extends DynamicTable functionality
const PerformanceDynamicTable = ({ 
  data, 
  columns, 
  onView, 
  containerHeight = '400px',
  className = '' 
}) => {
  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No performance data available</div>;
  }

  return (
    <div className={`${className}`}>
      <div className="overflow-hidden">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className="px-6 py-3 text-left text-sm font-medium text-gray-700"
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
              <th 
                className="px-6 py-3 text-center text-sm font-medium text-gray-700"
                style={{ width: '15%' }}
              >
                Actions
              </th>
            </tr>
          </thead>
        </table>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: containerHeight }}>
        <table className="min-w-full">
          <tbody>
            {data.map((item, index) => (
              <tr 
                key={item.id || index}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                {columns.map((column) => (
                  <td 
                    key={`${item.id || index}-${column.key}`} 
                    className="px-6 py-4 whitespace-nowrap text-gray-700"
                  >
                    {item[column.key]}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => onView(item)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClassPerformance;