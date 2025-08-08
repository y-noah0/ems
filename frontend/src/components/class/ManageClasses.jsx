import React, { useState, useEffect } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import { getClasses, createClass } from '../../services/classService';
import tradeService from '../../services/tradeService';
import { useAuth } from '../../context/AuthContext';
import subjectService from '../../services/subjectService';
import Layout from '../layout/Layout';
import AddStudentModal from './AddStudentModal';
import adminService from '../../services/adminService';

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

    if (!['L3', 'L4', 'L5'].includes(newClass.level)) {
      alert('Please select a valid class level.');
      return;
    }
    if (!newClass.trade || newClass.trade.length !== 24) {
      alert('Please select a valid trade.');
      return;
    }
    if (!newClass.schoolId || newClass.schoolId.length !== 24) {
      alert('Invalid school ID.');
      return;
    }
    if (!newClass.year || newClass.year < 2000) {
      alert('Please enter a valid year.');
      return;
    }

    try {
      await createClass(newClass);
      setShowAddModal(false);
      fetchAll();
    } catch (error) {
      console.error('Error creating class:', error);
      alert(error.message);
    }
  };

  const handleViewClass = (cls) => {
    setSelectedClass(cls);
    setStudents([]);
    setStudentsLoading(true);
    setStudentsError('');
    adminService
      .getStudentsByClass(cls._id)
      .then((students) => {
        setStudents(students);
        setStudentsLoading(false);
      })
      .catch((error) => {
        setStudents([]);
        setStudentsError(error.message || 'Failed to fetch students');
        setStudentsLoading(false);
        console.error('Error fetching students:', error);
      });
  };

  const handleBack = () => {
    setSelectedClass(null);
  };

  const handleAddStudent = () => {
    setShowAddStudentModal(true);
  };

  return (
    <Layout>
      <div className="p-6 space-y-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="titlebar shadow-sm rounded-lg bg-white">
          <h1 className="title px-6 py-4">Manage Classes</h1>
          <div className="px-6 py-4">
            {!selectedClass ? (
              <button
                onClick={handleAddClass}
                className="btn-primary flex items-center gap-2 shadow-lg"
              >
                <FiPlus size={20} />
                <span>Add Class</span>
              </button>
            ) : (
              <button
                onClick={handleAddStudent}
                className="btn-primary flex items-center gap-2 shadow-lg"
              >
                <FiPlus size={20} />
                <span>Add Student</span>
              </button>
            )}
          </div>
        </div>

        {/* Classes Grid or Selected Class Details */}
        {!selectedClass ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {loading ? (
              <div className="text-center text-blue-600 text-lg font-semibold animate-pulse">
                Loading classes...
              </div>
            ) : classesData.length === 0 ? (
              <p className="text-center text-gray-600 text-lg font-medium">
                No classes available. Create your first class!
              </p>
            ) : (
              classesData.classes.map((cls) => (
                <div
                  key={cls._id}
                  className="relative bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 p-8 flex flex-col items-center justify-between group cursor-pointer"
                  onClick={() => handleViewClass(cls)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleViewClass(cls)}
                >
                  <div className="absolute top-4 right-4 opacity-15 text-[7rem] select-none pointer-events-none text-blue-200">
                    📚
                  </div>
                  <div className="z-10 text-center space-y-3">
                    <div className="text-4xl font-extrabold text-blue-700 tracking-tight drop-shadow-md">
                      {cls.level}
                      <span className="ml-2 text-2xl font-semibold text-blue-600">
                        {typeof cls.trade === 'object'
                          ? cls.trade.name
                          : tradeOptions.find((t) => t._id === cls.trade)?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="uppercase text-xs font-semibold tracking-widest text-blue-400 bg-blue-50 px-4 py-1 rounded-full shadow-sm">
                      Academic Class
                    </div>
                  </div>
                  <button
                    className="btn-primary w-full mt-6 shadow-md hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewClass(cls);
                    }}
                  >
                    View Details
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="container">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedClass.level}{' '}
                {tradeOptions.find((t) => t._id === selectedClass.trade)?.code || ''} Details
              </h2>
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md shadow-sm transition"
                onClick={handleBack}
              >
                Back to Classes
              </button>
            </div>

            {/* Students Table */}
            {studentsLoading ? (
              <div className="flex justify-center items-center py-10 text-blue-600 animate-pulse font-semibold text-lg">
                Loading students...
              </div>
            ) : studentsError ? (
              <p className="text-red-600 font-medium">{studentsError}</p>
            ) : students.length === 0 ? (
              <p className="text-gray-600 font-medium">No students in this class yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
                      >
                        Registration Number
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {students.map((student, i) => (
                      <tr
                        key={student._id}
                        className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-blue-50'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.fullName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {student.registrationNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex gap-2">
                          <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md transition shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                            Delete
                          </button>
                          <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md transition shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Add Class Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <div
              className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-class-title"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 id="add-class-title" className="text-xl font-bold text-blue-700">
                  Add Class
                </h2>
                <button
                  className="bg-gray-200 hover:bg-gray-300 rounded-full p-2 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onClick={() => setShowAddModal(false)}
                  aria-label="Close Add Class Modal"
                >
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div>
                  <label htmlFor="level" className="form-label">
                    Level
                  </label>
                  <select
                    id="level"
                    name="level"
                    value={newClass.level || ''}
                    onChange={handleAddInputChange}
                    className="input-modern"
                    required
                  >
                    <option value="">Select level</option>
                    <option value="L3">L3</option>
                    <option value="L4">L4</option>
                    <option value="L5">L5</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="trade" className="form-label">
                    Trade
                  </label>
                  <select
                    id="trade"
                    name="trade"
                    value={newClass.trade || ''}
                    onChange={handleAddInputChange}
                    className="input-modern"
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
                  <label htmlFor="year" className="form-label">
                    Year
                  </label>
                  <input
                    type="number"
                    id="year"
                    name="year"
                    value={newClass.year || ''}
                    onChange={handleAddInputChange}
                    min={2000}
                    max={2100}
                    placeholder="e.g. 2025"
                    className="input-modern"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">School</label>
                  <input
                    type="text"
                    value={currentUser.school || 'Your School'}
                    disabled
                    className="input-modern bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="capacity" className="form-label">
                    Capacity
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    value={newClass.capacity || 30}
                    onChange={handleAddInputChange}
                    min={1}
                    className="input-modern"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subjects" className="form-label">
                    Subjects
                  </label>
                  <select
                    id="subjects"
                    name="subjects"
                    multiple
                    value={newClass.subjects || []}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions, (opt) => opt.value);
                      setNewClass((prev) => ({ ...prev, subjects: options }));
                    }}
                    className="input-modern"
                    required
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400">Hold Ctrl or Cmd to select multiple</span>
                </div>

                <button type="submit" className="btn-primary w-full">
                  Add
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <AddStudentModal
            onClose={() => setShowAddStudentModal(false)}
            selectedClass={selectedClass}
            currentUser={currentUser}
            onRegistered={async () => {
              setShowAddStudentModal(false);
              if (selectedClass) {
                setStudentsLoading(true);
                setStudentsError('');
                try {
                  const students = await adminService.getStudentsByClass(selectedClass._id);
                  setStudents(students);
                } catch (error) {
                  setStudents([]);
                  setStudentsError(error.message || 'Failed to fetch students');
                }
                setStudentsLoading(false);
              }
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default ManageClasses;
