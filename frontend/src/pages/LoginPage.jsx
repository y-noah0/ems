import React, { useState, useMemo } from 'react';
import { FiEdit, FiTrash2, FiUser, FiMail, FiPhoneCall } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherManagementTableNew = () => {
  const [data, setData] = useState([
    { names: 'John Fuwag', email: '0772', phone: '123-456-7890', assignedCourses: 'Math', lastLogin: '2025-07-15', accessManagement: false, deleteUpdate: false, isEditing: false },
    { names: 'Sarah Kim', email: '0888', phone: '098-765-4321', assignedCourses: 'Science', lastLogin: '2025-07-20', accessManagement: true, deleteUpdate: false, isEditing: false },
    { names: 'Michael Lee', email: '0999', phone: '555-555-5555', assignedCourses: 'History', lastLogin: '2025-07-10', accessManagement: false, deleteUpdate: true, isEditing: false },
  ]);

  const [filters, setFilters] = useState({
    course: '',
    access: '',
    isEditing: '',
    recentLogin: '',
  });

  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = (index, field) => {
    const newData = [...data];
    newData[index][field] = !newData[index][field];
    setData(newData);
  };

  const handleDropdownChange = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const handleEditToggle = (index) => {
    const newData = [...data];
    newData[index].isEditing = !newData[index].isEditing;
    setData(newData);
  };

  const handleInputChange = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const handleDelete = (index) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesCourse = !filters.course || row.assignedCourses === filters.course;
      const matchesAccess = filters.access === ''
        || (filters.access === 'true' && row.accessManagement)
        || (filters.access === 'false' && !row.accessManagement);
      const matchesEditing = filters.isEditing === ''
        || (filters.isEditing === 'true' && row.isEditing)
        || (filters.isEditing === 'false' && !row.isEditing);
      const matchesLogin = filters.recentLogin === ''
        || (filters.recentLogin === 'recent' && new Date(row.lastLogin) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
        || (filters.recentLogin === 'old' && new Date(row.lastLogin) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
      const matchesSearch = row.names.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCourse && matchesAccess && matchesEditing && matchesLogin && matchesSearch;
    });
  }, [data, filters, searchQuery]);

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-white to-gray-50">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <FiUser className="text-blue-500" /> Teacher Management
      </h2>

      {/* Filters + Search + Button */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 w-full sm:w-80">
          <h3 className="text-md font-semibold text-gray-700 mb-4">🔍 Filter Teachers</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Assigned Course</label>
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="w-full p-2 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Courses</option>
                <option value="Math">Math</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Access</label>
              <select
                value={filters.access}
                onChange={(e) => handleFilterChange('access', e.target.value)}
                className="w-full p-2 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Access States</option>
                <option value="true">With Access</option>
                <option value="false">No Access</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Edit Mode</label>
              <select
                value={filters.isEditing}
                onChange={(e) => handleFilterChange('isEditing', e.target.value)}
                className="w-full p-2 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Edit States</option>
                <option value="true">Editing</option>
                <option value="false">Not Editing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Login Activity</label>
              <select
                value={filters.recentLogin}
                onChange={(e) => handleFilterChange('recentLogin', e.target.value)}
                className="w-full p-2 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Logins</option>
                <option value="recent">Recent (Last 14 Days)</option>
                <option value="old">Old</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-end w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search Teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded-lg shadow-sm text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
            onClick={() => alert('Course Assignment modal coming soon!')}
          >
            Course Assignment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto shadow-xl rounded-xl bg-white border border-gray-200">
        <table className="w-full border-collapse min-w-[900px]">
          <thead className="bg-gray-100 text-center">
            <tr>
              {['Name', 'Email', 'Phone', 'Assigned', 'Last Login', 'Access', 'Actions'].map((header, i) => (
                <th
                  key={i}
                  className="p-4 text-gray-600 text-sm font-semibold uppercase border-b border-gray-300 text-center"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredData.map((row, index) => (
                <motion.tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <td className="p-4 text-center">
                    {row.isEditing ? (
                      <input
                        value={row.names}
                        onChange={(e) => handleInputChange(index, 'names', e.target.value)}
                        className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                        <FiUser className="text-blue-500" />
                        {row.names}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600 text-center">
                    {row.isEditing ? (
                      <input
                        value={row.email}
                        onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                        className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FiMail className="text-purple-400" />
                        {row.email}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600 text-center">
                    {row.isEditing ? (
                      <input
                        value={row.phone}
                        onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                        className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FiPhoneCall className="text-green-400" />
                        {row.phone}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <select
                      value={row.assignedCourses}
                      onChange={(e) => handleDropdownChange(index, 'assignedCourses', e.target.value)}
                      className="w-full p-2 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      disabled={row.isEditing}
                    >
                      <option value="">Select</option>
                      <option value="Math">Math</option>
                      <option value="Science">Science</option>
                      <option value="History">History</option>
                    </select>
                  </td>
                  <td className="p-4 text-sm text-gray-600 text-center">{row.lastLogin}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggle(index, 'accessManagement')}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${row.accessManagement ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                    >
                      <motion.span
                        layout
                        className="w-4 h-4 bg-white rounded-full shadow-md"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        animate={{ x: row.accessManagement ? 20 : 0 }}
                      />
                    </button>
                  </td>
                  <td className="p-4 flex justify-center gap-3">
                    <button
                      onClick={() => handleEditToggle(index)}
                      className="text-blue-500 hover:text-blue-700 transition-transform transform hover:scale-110"
                    >
                      <FiEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-500 hover:text-red-700 transition-transform transform hover:scale-110"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherManagementTableNew;
