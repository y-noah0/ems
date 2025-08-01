import React, { useState, useRef, useEffect } from 'react';
import DynamicTable from '../class/DynamicTable';
import { FiChevronDown } from 'react-icons/fi';
import deanService from '../../services/deanService';

const ClassPerformance = () => {
  // Performance data fetched from API
  const [performanceData, setPerformanceData] = useState([]);

  // Dropdown options
  const academicYearOptions = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
  const termOptions = ['Term 1', 'Term 2', 'Term 3'];
  // Class options from backend
  const [classOptionsData, setClassOptionsData] = useState([]);

  // Currently selected filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [term, setTerm] = useState('Term 1');
  const [selectedClass, setSelectedClass] = useState('');
  
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

  // Fetch class list on component mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const classes = await deanService.getAllClasses();
        setClassOptionsData(classes);
        if (classes.length) setSelectedClass(`${classes[0].level} ${classes[0].trade.code}`);
      } catch (err) {
        console.error('Error loading classes:', err);
      }
    };
    loadClasses();
  }, []);

  // Fetch performance data when class changes
  useEffect(() => {
    const loadPerformance = async () => {
      if (!selectedClass) return;
      try {
        // find selected class object
        const cls = classOptionsData.find(c => `${c.level} ${c.trade.code}` === selectedClass);
        if (!cls) return;
        const report = await deanService.generateClassReport(cls._id, /* termId */ '');
        setPerformanceData(report.students || []);
      } catch (err) {
        console.error('Error loading performance:', err);
      }
    };
    loadPerformance();
  }, [selectedClass, classOptionsData]);

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
              {selectedClass || 'Select class'}
              <FiChevronDown className={`transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showClassDropdown && (
              <div className="absolute right-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-20">
                {classOptionsData.map((cls) => {
                  const label = `${cls.level} ${cls.trade.code}`;
                  return (
                    <button
                      key={cls._id}
                      className={`block w-full text-left px-4 py-2 text-sm ${label === selectedClass ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                      onClick={() => {
                        setSelectedClass(label);
                        setShowClassDropdown(false);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {/* Use the updated DynamicTable component */}
        <DynamicTable
          data={performanceData}
          columns={[
            { key: 'name', title: 'Names', width: '25%' },
            { key: 'assessment1', title: 'Ass I', width: '12%' },
            { key: 'assessment2', title: 'Ass II', width: '12%' },
            { key: 'test', title: 'Test', width: '12%' },
            { key: 'exams', title: 'Exams', width: '12%' },
            { key: 'total', title: 'Total', width: '12%' },
          ]}
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