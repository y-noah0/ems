import React, { useState, useEffect } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import { getClasses, createClass } from '../../services/classService';
import tradeService from '../../services/tradeService';
import { useAuth } from '../../context/AuthContext';
import subjectService from '../../services/subjectService';



const ManageClasses = () => {
  const { currentUser } = useAuth();

  const [classesData, setClassesData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState({
    level: '',
    trade: '',
    year: '',
    schoolId: '', // will be set automatically
    capacity: 30,
    subjects: [],
  });
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeOptions, setTradeOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [students, setStudents] = useState([]);

  // Fetch all data on mount
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
      subjectService.getAllSubjects(),
    ]);
    setClassesData(classes);
    setTradeOptions(trades || []); 
    setSubjectOptions(subjects  || []);
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
      schoolId: currentUser.school, // set automatically
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

  // Log the payload before sending
  console.log('Creating class with data:', newClass);

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
    // TODO: fetch students for this class from your API
    setStudents([]); // Replace with real fetch
  };

  const handleBack = () => {
    setSelectedClass(null);
  };

  const handleAddStudent = () => {
    alert('Add student functionality goes here.');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-800">Manage Classes</h1>
        {!selectedClass ? (
          <button
            onClick={handleAddClass}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
          >
            <FiPlus size={18} />
            <span>Add class</span>
          </button>
        ) : (
          <button
            onClick={handleAddStudent}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
          >
            <FiPlus size={18} />
            <span>Add student</span>
          </button>
        )}
      </div>

      {/* Show class cards or class details */}
      {!selectedClass ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {loading ? (
            <div>Loading...</div>
          ) : classesData.length === 0 ? (
            <p className="text-gray-500">No classes available. Create your first class!</p>
          ) : (
            classesData.classes.map((cls) => (
       <div
  key={cls._id}
  className="relative bg-white bg-opacity-90 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-shadow duration-300 p-6 flex flex-col items-center justify-between border border-blue-100 group max-w-xs mx-auto sm:max-w-sm md:max-w-md"
>
  <div className="absolute top-4 right-4 pointer-events-none select-none">
    <span
      className="text-6xl sm:text-7xl md:text-8xl"
      style={{
        filter: 'drop-shadow(0 4px 16px rgba(59,130,246,0.18))',
        opacity: 0.18,
        transition: 'opacity 0.3s',
      }}
    >
      📚
    </span>
  </div>
  <div className="flex flex-col items-center mb-6 text-center">
    <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 mb-1 tracking-wide drop-shadow-sm">
      {cls.level}
<span className="ml-2 text-xl sm:text-2xl font-semibold text-blue-600">
  {typeof cls.trade === 'object' && cls.trade !== null
    ? cls.trade.name
    : tradeOptions.find((t) => t._id === cls.trade)?.name || 'Unknown Trade'}
</span>
    </div>
    <div className="text-xs uppercase tracking-widest text-blue-400 font-semibold bg-blue-50 px-3 py-1 rounded-full shadow-sm">
      Academic Class
    </div>
  </div>
  <button
    className="mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold py-2 rounded-xl shadow-lg hover:shadow-blue-300 transition-all duration-200 text-base tracking-wide"
    onClick={() => handleViewClass(cls)}
  >
    View Details
  </button>
</div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedClass.level}
              {tradeOptions.find((t) => t._id === selectedClass.trade)?.code || ''} Details
            </h2>
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded"
              onClick={handleBack}
            >
              Back to Classes
            </button>
          </div>
          <div className="mb-4 flex justify-between items-center">
            <span className="font-medium">Students</span>
          </div>
          {students.length === 0 ? (
            <p className="text-gray-500">No students in this class yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.studentId}
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
          className="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-lg p-8 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-blue-700">Add Class</h2>
              <button
                className="text-gray-500 hover:text-gray-700 bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center"
                onClick={() => setShowAddModal(false)}
              >
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  id="level"
                  name="level"
                  value={newClass.level || ''}
                  onChange={handleAddInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select level</option>
                  <option value="L3">L3</option>
                  <option value="L4">L4</option>
                  <option value="L5">L5</option>
                </select>
              </div>
              <div>
                <label htmlFor="trade" className="block text-sm font-medium text-gray-700 mb-1">
                  Trade
                </label>
                <select
  name="trade"
  id="trade"
  value={newClass.trade || ''}
  onChange={handleAddInputChange}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  required
>
  <option value="">Select trade</option>
  {Array.isArray(tradeOptions) && tradeOptions.map((trade) => (
    <option key={trade._id} value={trade._id}>
      {trade.name} ({trade.code})
    </option>
  ))}
</select>
              </div>
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {/* School is set automatically, just show the name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School
                </label>
                <input
                  type="text"
                  value={currentUser.school || 'Your School'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={newClass.capacity || 30}
                  onChange={handleAddInputChange}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="subjects" className="block text-sm font-medium text-gray-700 mb-1">
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
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     required
                   >
                     {Array.isArray(subjectOptions) && subjectOptions.map((subject) => (
                       <option key={subject._id} value={subject._id}>
                         {subject.name}
                       </option>
                     ))}
                   </select>
                <span className="text-xs text-gray-400">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple
                </span>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md font-semibold"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClasses;
