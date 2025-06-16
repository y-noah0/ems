import React, { useState, useRef, useEffect } from 'react';
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
    {
      id: 8,
      name: 'Mukamana alexis',
      assessment1: '87%',
      assessment2: '82%',
      test: '89%',
      exams: '85%',
      total: '84%'
    },
    {
      id: 9,
      name: 'Mukamana alexis',
      assessment1: '87%',
      assessment2: '82%',
      test: '89%',
      exams: '85%',
      total: '84%'
    },
    {
      id: 10,
      name: 'Mukamana alexis',
      assessment1: '87%',
      assessment2: '82%',
      test: '89%',
      exams: '85%',
      total: '84%'
    }
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

  // Dropdown options
  const academicYearOptions = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
  const termOptions = ['Term 1', 'Term 2', 'Term 3'];
  const classOptions = ['P1 A', 'P1 B', 'P2 A', 'P2 B', 'P3 A', 'P3 B', 'P4 A', 'P4 B', 'P5 A', 'P5 B', 'P6 A', 'P6 B'];

  // Currently selected filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [term, setTerm] = useState('Term 1');
  const [selectedClass, setSelectedClass] = useState('P5 B');
  
  // Dropdown visibility states
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  
  // Refs for dropdown containers
  const yearDropdownRef = useRef(null);
  const termDropdownRef = useRef(null);
  const classDropdownRef = useRef(null);

  // Handle click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
      if (termDropdownRef.current && !termDropdownRef.current.contains(event.target)) {
        setShowTermDropdown(false);
      }
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
        setShowClassDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter data based on selections
  useEffect(() => {
    // Here you would typically fetch data based on the filters
    // For now, we'll just log the filter changes
    console.log('Filters changed:', { academicYear, term, selectedClass });
    
    // Mock API call or data filtering
    // In a real app, you would fetch data from your API here
    // setPerformanceData(fetchedData);
  }, [academicYear, term, selectedClass]);

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
          <div ref={yearDropdownRef} className="relative">
            <button 
              className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[140px]"
              onClick={() => setShowYearDropdown(!showYearDropdown)}
            >
              {academicYear}
              <FiChevronDown className={`transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showYearDropdown && (
              <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                {academicYearOptions.map((year) => (
                  <button
                    key={year}
                    className={`block w-full text-left px-4 py-2 text-sm ${year === academicYear ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                    onClick={() => {
                      setAcademicYear(year);
                      setShowYearDropdown(false);
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Term Dropdown */}
          <div ref={termDropdownRef} className="relative">
            <button 
              className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[100px]"
              onClick={() => setShowTermDropdown(!showTermDropdown)}
            >
              {term}
              <FiChevronDown className={`transition-transform ${showTermDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showTermDropdown && (
              <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                {termOptions.map((termOption) => (
                  <button
                    key={termOption}
                    className={`block w-full text-left px-4 py-2 text-sm ${termOption === term ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                    onClick={() => {
                      setTerm(termOption);
                      setShowTermDropdown(false);
                    }}
                  >
                    {termOption}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Class Dropdown */}
          <div ref={classDropdownRef} className="relative">
            <button 
              className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[100px]"
              onClick={() => setShowClassDropdown(!showClassDropdown)}
            >
              {selectedClass}
              <FiChevronDown className={`transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showClassDropdown && (
              <div className="absolute right-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-20">
                {classOptions.map((classOption) => (
                  <button
                    key={classOption}
                    className={`block w-full text-left px-4 py-2 text-sm ${classOption === selectedClass ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                    onClick={() => {
                      setSelectedClass(classOption);
                      setShowClassDropdown(false);
                    }}
                  >
                    {classOption}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {/* Use the updated DynamicTable component */}
        <DynamicTable
          data={performanceData}
          columns={performanceColumns}
          showActions={true}
          containerWidth="1040px"
          containerHeight="450px"
          actionsColumn={{
            title: 'Actions',
            width: '15%'
          }}
          renderCustomActions={(item) => (
            <button
              onClick={() => handleViewDetails(item)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View
            </button>
          )}
        />
      </div>
    </div>
  );
};

export default ClassPerformance;