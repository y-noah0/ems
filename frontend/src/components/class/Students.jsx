import React, { useState, useRef, useEffect } from 'react';
import DynamicTable from './DynamicTable';
import { FiChevronDown, FiPlus, FiX, FiEdit, FiRefreshCw } from 'react-icons/fi';

const StudentManagement = () => {
  // Sample student data matching your image
  const [studentsData, setStudentsData] = useState([
    { 
      id: 1, 
      fullName: 'Akamira Muto Martha',
      regNo: 'ST20250001',
      parentGuardian1: 'Kalisa dieudonne', 
      phone1: '0788362212', 
      parentGuardian2: 'Matera Menervie',
      phone2: '0798352735' 
    },
    { 
      id: 2, 
      fullName: 'Akamira Muto Martha',
      regNo: 'ST20250002', 
      parentGuardian1: 'Kalisa dieudonne', 
      phone1: '0788362212', 
      parentGuardian2: 'Matera Menervie',
      phone2: '0798352735' 
    },
    { 
      id: 3, 
      fullName: 'Akamira Muto Martha', 
      parentGuardian1: 'Kalisa dieudonne', 
      phone1: '0788362212', 
      parentGuardian2: 'Matera Menervie',
      phone2: '0798352735' 
    },
    { 
      id: 4, 
      fullName: 'Akamira Muto Martha', 
      parentGuardian1: 'Kalisa dieudonne', 
      phone1: '0788362212', 
      parentGuardian2: 'Matera Menervie',
      phone2: '0798352735' 
    },
    { 
      id: 5, 
      fullName: 'Akamira Muto Martha', 
      parentGuardian1: 'Kalisa dieudonne', 
      phone1: '0788362212', 
      parentGuardian2: 'Matera Menervie',
      phone2: '0798352735' 
    },
    { 
      id: 6, 
      fullName: 'Akamira Muto Martha', 
      parentGuardian1: 'Kalisa dieudonne', 
      phone1: '0788362212', 
      parentGuardian2: 'Matera Menervie',
      phone2: '0798352735' 
    },
    { 
      id: 7, 
      fullName: 'Akamira Muto Martha', 
      parentGuardian1: 'Kalisa dieudonne', 
      phone1: '0788362212', 
      parentGuardian2: 'Matera Menervie',
      phone2: '0798352735' 
    },
    { 
      id: 8, 
      fullName: 'Akamira Muto Martha', 
      parentGuardian1: 'Kalisa dieudonne', 
      phone1: '0788362212', 
      parentGuardian2: 'Matera Menervie',
      phone2: '0798352735' 
    }
  ]);
  
  // Filtered students data
  const [filteredStudentsData, setFilteredStudentsData] = useState(studentsData);

  // Define columns for the students table - adjusted to match the image format
  const studentColumns = [
    { key: 'id', title: 'No.', width: '5%' },
    { key: 'regNo', title: 'Reg. No.', width: '10%' },
    { key: 'fullName', title: 'Full student names', width: '22%' },
    { key: 'parentGuardian1', title: 'Parent/Guardian I', width: '15%' },
    { key: 'phone1', title: 'Phone', width: '12%' },
    { key: 'parentGuardian2', title: 'Parent/Guardian II', width: '15%' },
    { key: 'phone2', title: 'Phone', width: '12%' }
  ];

  // Dropdown options
  const academicYearOptions = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
  const classOptions = ['P1 A', 'P1 B', 'P2 A', 'P2 B', 'P3 A', 'P3 B', 'P4 A', 'P4 B', 'P5 A', 'P5 B', 'P6 A', 'P6 B'];
  
  // Currently selected filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [selectedClass, setSelectedClass] = useState('Class');
  
  // Dropdown visibility states
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  
  // Refs for dropdown containers
  const yearDropdownRef = useRef(null);
  const classDropdownRef = useRef(null);
  
  // Modal visibility states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Student form states
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    regNo: '',
    parentGuardian1: '',
    phone1: '',
    parentGuardian2: '',
    phone2: ''
  });
  
  const [editStudent, setEditStudent] = useState({
    id: null,
    fullName: '',
    regNo: '',
    parentGuardian1: '',
    phone1: '',
    parentGuardian2: '',
    phone2: ''
  });

  // Handle click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearDropdown(false);
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
    // In a real app, you would likely fetch data from an API here based on the filters
    console.log('Filters changed:', { academicYear, selectedClass });
    
    // For now, we'll just simulate filtering by showing all data
    // In a real implementation, you would filter based on the year and class
    setFilteredStudentsData(studentsData);
    
  }, [academicYear, selectedClass, studentsData]);

  // Function to generate a new student registration number
  const generateRegNo = () => {
    // Extract the year from academicYear (first 4 digits)
    const year = academicYear.split('-')[0];
    
    // Get the highest existing reg number
    const regNumbers = studentsData
      .map(student => student.regNo || '')
      .filter(regNo => regNo.startsWith(`ST${year}`))
      .map(regNo => parseInt(regNo.replace(`ST${year}`, ''), 10) || 0);
    
    // Find the highest number
    const highestNumber = regNumbers.length > 0 ? Math.max(...regNumbers) : 0;
    
    // Create new reg number (ST + year + sequential number padded to 4 digits)
    const newRegNumber = `ST${year}${(highestNumber + 1).toString().padStart(4, '0')}`;
    
    return newRegNumber;
  };
  
  // Handler to autogenerate registration number
  const handleGenerateRegNo = () => {
    const newRegNo = generateRegNo();
    setNewStudent(prev => ({
      ...prev,
      regNo: newRegNo
    }));
  };

  // Handler functions
  const handleEdit = (student) => {
    setEditStudent({
      id: student.id,
      fullName: student.fullName,
      regNo: student.regNo,
      parentGuardian1: student.parentGuardian1,
      phone1: student.phone1,
      parentGuardian2: student.parentGuardian2,
      phone2: student.phone2
    });
    setShowEditModal(true);
  };

  const handleDelete = (student) => {
    console.log('Delete student:', student);
    if (window.confirm(`Are you sure you want to delete ${student.fullName}?`)) {
      setStudentsData(studentsData.filter(s => s.id !== student.id));
    }
  };

  // Handler for viewing student details
  const handleView = (student) => {
    console.log('View student:', student);
    // You could navigate to a detail page or show a modal with student details
    alert(`Viewing details for ${student.fullName} (${student.regNo})`);
    // Alternatively, you could use react-router-dom to navigate:
    // history.push(`/students/${student.id}`);
  };

  const handleAddStudent = () => {
    setNewStudent({
      fullName: '',
      regNo: '',
      parentGuardian1: '',
      phone1: '',
      parentGuardian2: '',
      phone2: ''
    });
    setShowAddModal(true);
  };
  
  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };
  
  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };
  
  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddSubmit = (e) => {
    e.preventDefault();
    
    // Add validation here
    if (!newStudent.fullName || !newStudent.parentGuardian1 || !newStudent.phone1 || !newStudent.regNo) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Add new student to the list
    const newStudentData = {
      id: studentsData.length + 1,
      fullName: newStudent.fullName,
      regNo: newStudent.regNo,
      parentGuardian1: newStudent.parentGuardian1,
      phone1: newStudent.phone1,
      parentGuardian2: newStudent.parentGuardian2,
      phone2: newStudent.phone2
    };
    
    setStudentsData(prev => [...prev, newStudentData]);
    setShowAddModal(false);
  };
  
  const handleEditSubmit = (e) => {
    e.preventDefault();
    
    // Add validation here
    if (!editStudent.fullName || !editStudent.parentGuardian1 || !editStudent.phone1 || !editStudent.regNo) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Update student in the list
    setStudentsData(prev => 
      prev.map(student => 
        student.id === editStudent.id 
          ? { ...student, 
              fullName: editStudent.fullName,
              regNo: editStudent.regNo,
              parentGuardian1: editStudent.parentGuardian1, 
              phone1: editStudent.phone1,
              parentGuardian2: editStudent.parentGuardian2,
              phone2: editStudent.phone2 
            }
          : student
      )
    );
    
    setShowEditModal(false);
  };

  // Custom render function for actions column to show just "View" text link
  const renderViewAction = (item) => {
    return (
      <button
        onClick={() => handleView(item)}
        className="text-blue-500 hover:text-blue-700 font-medium"
      >
        View
      </button>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-800">Student Management</h1>
        
        <div className="flex items-center gap-4">
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
              <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
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
          
          {/* Add Student Button */}
          <button 
            onClick={handleAddStudent}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
          >
            <FiPlus size={18} />
            <span>Student</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <DynamicTable
          data={filteredStudentsData}
          columns={studentColumns}
          showActions={true}
          containerWidth="1040px" // Fixed width
          containerHeight="450px"  // Fixed height
          actionsColumn={{
            title: 'Actions',
            width: '7%'
          }}
          renderCustomActions={renderViewAction} // Use the custom renderer for View action
        />
      </div>
      
      {/* Add Student Modal */}
      {showAddModal && (
        <>
          {/* Modal Backdrop */}
          <div 
            className="fixed inset-0 backdrop-blur-sm bg-opacity-50 bg-gray-500 flex items-center justify-center z-50"
            onClick={handleCloseAddModal}
          >
            {/* Modal Content */}
            <div 
              className="bg-white rounded-lg w-full max-w-md p-6 relative"
              onClick={e => e.stopPropagation()} // Prevent clicks inside from closing modal
            >
              {/* Close Button */}
              <button 
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={handleCloseAddModal}
              >
                <FiX size={24} />
              </button>
              
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={newStudent.fullName}
                    onChange={handleAddInputChange}
                    placeholder="Akamira Muto Martha"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Registration Number Field with Generate Button */}
                <div>
                  <label htmlFor="regNo" className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="regNo"
                      name="regNo"
                      value={newStudent.regNo}
                      onChange={handleAddInputChange}
                      placeholder="ST20250001"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateRegNo}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md flex items-center justify-center gap-1"
                      title="Generate Registration Number"
                    >
                      <FiRefreshCw size={16} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Click the button to auto-generate a registration number</p>
                </div>
                
                <div>
                  <label htmlFor="parentGuardian1" className="block text-sm font-medium text-gray-700 mb-1">
                    Parent/Guardian I
                  </label>
                  <input
                    type="text"
                    id="parentGuardian1"
                    name="parentGuardian1"
                    value={newStudent.parentGuardian1}
                    onChange={handleAddInputChange}
                    placeholder="Kalisa dieudonne"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone1" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone I
                  </label>
                  <input
                    type="tel"
                    id="phone1"
                    name="phone1"
                    value={newStudent.phone1}
                    onChange={handleAddInputChange}
                    placeholder="0788362212"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="parentGuardian2" className="block text-sm font-medium text-gray-700 mb-1">
                    Parent/Guardian II
                  </label>
                  <input
                    type="text"
                    id="parentGuardian2"
                    name="parentGuardian2"
                    value={newStudent.parentGuardian2}
                    onChange={handleAddInputChange}
                    placeholder="Matera Menervie"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone2" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone II
                  </label>
                  <input
                    type="tel"
                    id="phone2"
                    name="phone2"
                    value={newStudent.phone2}
                    onChange={handleAddInputChange}
                    placeholder="0798352735"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
                  >
                    <FiPlus size={18} />
                    Add Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
      
      {/* Edit Student Modal */}
      {showEditModal && (
        <>
          {/* Modal Backdrop */}
          <div 
            className="fixed inset-0 backdrop-blur-sm bg-opacity-50 bg-gray-500 flex items-center justify-center z-50"
            onClick={handleCloseEditModal}
          >
            {/* Modal Content */}
            <div 
              className="bg-white rounded-lg w-full max-w-md p-6 relative"
              onClick={e => e.stopPropagation()} // Prevent clicks inside from closing modal
            >
              {/* Close Button */}
              <button 
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={handleCloseEditModal}
              >
                <FiX size={24} />
              </button>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label htmlFor="editFullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    id="editFullName"
                    name="fullName"
                    value={editStudent.fullName}
                    onChange={handleEditInputChange}
                    placeholder="Akamira Muto Martha"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Registration Number Field */}
                <div>
                  <label htmlFor="editRegNo" className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    id="editRegNo"
                    name="regNo"
                    value={editStudent.regNo}
                    onChange={handleEditInputChange}
                    placeholder="ST20250001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="editParentGuardian1" className="block text-sm font-medium text-gray-700 mb-1">
                    Parent/Guardian I
                  </label>
                  <input
                    type="text"
                    id="editParentGuardian1"
                    name="parentGuardian1"
                    value={editStudent.parentGuardian1}
                    onChange={handleEditInputChange}
                    placeholder="Kalisa dieudonne"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="editPhone1" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone I
                  </label>
                  <input
                    type="tel"
                    id="editPhone1"
                    name="phone1"
                    value={editStudent.phone1}
                    onChange={handleEditInputChange}
                    placeholder="0788362212"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="editParentGuardian2" className="block text-sm font-medium text-gray-700 mb-1">
                    Parent/Guardian II
                  </label>
                  <input
                    type="text"
                    id="editParentGuardian2"
                    name="parentGuardian2"
                    value={editStudent.parentGuardian2}
                    onChange={handleEditInputChange}
                    placeholder="Matera Menervie"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="editPhone2" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone II
                  </label>
                  <input
                    type="tel"
                    id="editPhone2"
                    name="phone2"
                    value={editStudent.phone2}
                    onChange={handleEditInputChange}
                    placeholder="0798352735"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
                  >
                    <FiEdit size={18} />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentManagement;