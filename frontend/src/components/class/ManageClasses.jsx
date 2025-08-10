import React, { useState, useEffect } from 'react';
import { FiPlus, FiX, FiChevronRight, FiUsers, FiBook, FiCalendar, FiMaximize2 } from 'react-icons/fi';
import { getClasses, createClass } from '../../services/classService';
import tradeService from '../../services/tradeService';
import { useAuth } from '../../context/AuthContext';
import subjectService from '../../services/subjectService';
import enrollmentService from '../../services/enrollmentService';
import Layout from '../layout/Layout';
import AddStudentModal from './AddStudentModal';
import { toast } from 'react-toastify';

const ManageClasses = () => {
  const { currentUser } = useAuth();

  const [classesData, setClassesData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState({
    level: '',
    trade: '',
    year: '',
    schoolId: '',
    capacity: 30,
    subjects: [],
  });
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeOptions, setTradeOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const getTradeDisplayInfo = (classObj, trades) => {
    if (classObj?.trade && typeof classObj.trade === 'object') {
      return {
        name: classObj.trade.name,
        code: classObj.trade.code
      };
    }
    
    if (classObj?.trade && Array.isArray(trades)) {
      const foundTrade = trades.find(t => t._id === classObj.trade);
      return {
        name: foundTrade?.name || 'Unknown Trade',
        code: foundTrade?.code || ''
      };
    }
    
    return {
      name: 'Unknown Trade',
      code: ''
    };
  };

  useEffect(() => {
    if (currentUser?.school) {
      fetchAll();
    }
  }, [currentUser?.school]);

  const fetchAll = async () => {
    if (!currentUser?.school) return;

    setLoading(true);
    try {
      const [classes, trades, subjects] = await Promise.all([
        getClasses(currentUser.school),
        tradeService.getAllTrades(),
        subjectService.getSubjects(currentUser.school),
      ]);
      setClassesData(classes);
      setTradeOptions(trades || []);
      setSubjectOptions(subjects || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleAddClass = () => {
    setNewClass({
      level: '',
      trade: '',
      year: '',
      schoolId: currentUser.school,
      capacity: 30,
      subjects: [],
    });
    setShowAddModal(true);
  };

  const handleAddInputChange = (e) => {
    const { name, value, multiple, options } = e.target;
    if (multiple) {
      setNewClass((prev) => ({
        ...prev,
        [name]: Array.from(options).filter((o) => o.selected).map((o) => o.value),
      }));
    } else {
      setNewClass((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };
const handleAddSubmit = async (e) => {
  e.preventDefault();

  // Validate all required fields exist
  const requiredFields = ['level', 'trade', 'year', 'schoolId'];
  const missingFields = requiredFields.filter(field => !newClass[field]);
  
  if (missingFields.length > 0) {
    toast.error(`Missing fields: ${missingFields.join(', ')}`);
    return;
  }

  try {
    // Create a clean payload
    const payload = {
      level: newClass.level,
      trade: newClass.trade,
      year: Number(newClass.year),
      schoolId: currentUser.school, // Force use of auth context school
      capacity: Number(newClass.capacity) || 30,
      subjects: Array.isArray(newClass.subjects) ? 
        newClass.subjects : 
        [newClass.subjects].filter(Boolean)
    };

    console.log('Final Payload:', payload);
    await createClass(payload);
    toast.success('Class created successfully!');
    setShowAddModal(false);
    fetchAll();
  } catch (error) {
    console.error('Full error details:', {
      message: error.message,
      response: error.response?.data,
      config: error.config
    });
    toast.error(`Creation failed: ${error.message}`);
  }
};
const handleViewClass = async (cls) => {
  setSelectedClass(cls);
  setStudents([]);
  setStudentsLoading(true);
  setStudentsError('');

  try {
    // 1. Verify currentUser and schoolId exist
    if (!currentUser?.school) {
      throw new Error('Your account is not assigned to any school');
    }

    // 2. Simple ID format check (basic string length check)
    if (typeof currentUser.school !== 'string' || currentUser.school.length !== 24) {
      throw new Error('Invalid school ID format');
    }

    // 3. Debug log before making the request
    console.log('Fetching students for class:', {
      classId: cls._id,
      schoolId: currentUser.school
    });

    // 4. Make the API request
    const enrolledStudents = await enrollmentService.getStudentsByClass(
      cls._id,
      currentUser.school
    );
    
    setStudents(enrolledStudents);
    
  } catch (error) {
    console.error('Error fetching students:', {
      error: error.message,
      response: error.response?.data
    });

    const errorMessage = error.response?.data?.message || 
                       error.message || 
                       'Failed to fetch students';
    
    setStudentsError(errorMessage);
    toast.error(errorMessage);
  } finally {
    setStudentsLoading(false);
  }
};

  const handleBack = () => {
    setSelectedClass(null);
  };

  const handleAddStudent = () => {
    setShowAddStudentModal(true);
  };

  const handleRemoveStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to remove this student from the class?')) {
      try {
        // Remove the enrollment for this student in this class
        await enrollmentService.deleteEnrollmentByStudentAndClass(
          studentId,
          selectedClass._id,
          currentUser.school
        );
        toast.success('Student removed from class');
        // Refresh the student list
        handleViewClass(selectedClass);
      } catch (error) {
        toast.error(error.message || 'Failed to remove student');
      }
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Manage Classes</h1>
            <p className="text-gray-500 mt-1">
              {!selectedClass 
                ? "View and manage all classes" 
                : `Managing ${selectedClass.level} ${getTradeDisplayInfo(selectedClass, tradeOptions).name}`}
            </p>
          </div>
          <div>
            {!selectedClass ? (
              <button
                onClick={handleAddClass}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <FiPlus size={18} />
                <span>Add Class</span>
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  Back to Classes
                </button>
                <button
                  onClick={handleAddStudent}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  <FiPlus size={18} />
                  <span>Add Student</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Classes Grid or Selected Class Details */}
        {!selectedClass ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-blue-600 font-medium">Loading classes...</p>
              </div>
            ) : classesData.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <FiBook className="text-blue-500 text-3xl" />
                </div>
                <h3 className="text-lg font-medium text-gray-700">No classes found</h3>
                <p className="text-gray-500 mt-1 mb-4">Create your first class to get started</p>
                <button
                  onClick={handleAddClass}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
                >
                  <FiPlus size={16} />
                  Add Class
                </button>
              </div>
            ) : (
              classesData.classes?.map((cls) => {
                const tradeInfo = getTradeDisplayInfo(cls, tradeOptions);
                return (
                  <div
                    key={cls._id}
                    className="relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden group cursor-pointer"
                    onClick={() => handleViewClass(cls)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleViewClass(cls)}
                  >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-blue-300"></div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">
                            {cls.level} - {tradeInfo.name}
                          </h3>
                          <p className="text-gray-500 text-sm mt-1">
                            {cls.year} • Capacity: {cls.capacity}
                          </p>
                        </div>
                        <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {cls.subjects?.length || 0} subjects
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center text-gray-500 text-sm">
                          <FiUsers className="mr-1.5" />
                          <span>{cls.studentCount || 0} students</span>
                        </div>
                        <button
                          className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-sm font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewClass(cls);
                          }}
                        >
                          View details <FiChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Class Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 p-1.5 rounded-lg">
                      {selectedClass.level}
                    </span>
                    <span>
                      {getTradeDisplayInfo(selectedClass, tradeOptions).name}
                      {getTradeDisplayInfo(selectedClass, tradeOptions).code && (
                        <span className="text-gray-500 ml-1">
                          ({getTradeDisplayInfo(selectedClass, tradeOptions).code})
                        </span>
                      )}
                    </span>
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <FiCalendar size={14} /> {selectedClass.year}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiUsers size={14} /> {students.length} enrolled students
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg shadow-xs transition-all flex items-center gap-1">
                    <FiMaximize2 size={14} /> Export
                  </button>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-hidden">
              {studentsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-blue-600 font-medium">Loading students...</p>
                </div>
              ) : studentsError ? (
                <div className="p-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <FiX className="text-red-500 text-2xl" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">Error loading students</h3>
                  <p className="text-red-500 mt-1 mb-4">{studentsError}</p>
                  <button
                    onClick={() => handleViewClass(selectedClass)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : students.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FiUsers className="text-gray-500 text-2xl" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">No students in this class</h3>
                  <p className="text-gray-500 mt-1 mb-4">Add students to get started</p>
                  <button
                    onClick={handleAddStudent}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
                  >
                    <FiPlus size={16} />
                    Add Student
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration Number
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                                {student.fullName.charAt(0)}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                                <div className="text-sm text-gray-500">{student.gender || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                            {student.registrationNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors">
                                Edit
                              </button>
                              <button 
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm transition-colors"
                                onClick={() => handleRemoveStudent(student._id)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Class Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div 
              className="bg-white rounded-xl w-full max-w-md shadow-xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Create New Class</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
                <div>
                  <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                    Class Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="level"
                    name="level"
                    value={newClass.level}
                    onChange={handleAddInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select level</option>
                    <option value="L3">Level 3 (L3)</option>
                    <option value="L4">Level 4 (L4)</option>
                    <option value="L5">Level 5 (L5)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="trade" className="block text-sm font-medium text-gray-700 mb-1">
                    Trade <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="trade"
                    name="trade"
                    value={newClass.trade}
                    onChange={handleAddInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select trade</option>
                    {tradeOptions.map((trade) => (
                      <option key={trade._id} value={trade._id}>
                        {trade.name} ({trade.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="year"
                    name="year"
                    value={newClass.year}
                    onChange={handleAddInputChange}
                    min="2000"
                    max="2100"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 2025"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                    Class Capacity
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    value={newClass.capacity}
                    onChange={handleAddInputChange}
                    min="1"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subjects" className="block text-sm font-medium text-gray-700 mb-1">
                    Subjects <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subjects"
                    name="subjects"
                    multiple
                    value={newClass.subjects}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions, (opt) => opt.value);
                      setNewClass((prev) => ({ ...prev, subjects: options }));
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-auto min-h-[100px]"
                    required
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Hold Ctrl (Windows) or Command (Mac) to select multiple subjects
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <AddStudentModal
            onClose={() => setShowAddStudentModal(false)}
            selectedClass={selectedClass}
            onRegistered={async () => {
              setShowAddStudentModal(false);
              if (selectedClass) {
                // Refresh the student list after adding
                handleViewClass(selectedClass);
              }
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default ManageClasses;