import React, { useState, useMemo } from 'react';
import { FiEdit, FiTrash2, FiUser, FiMail, FiPhoneCall, FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherManagementTableNew = () => {
    const [data, setData] = useState([
        { names: 'John Fuwag', email: 'john@example.com', phone: '123-456-7890', assignedCourses: 'Math', lastLogin: '2025-07-15', accessManagement: false, deleteUpdate: false, isEditing: false },
        { names: 'Sarah Kim', email: 'sarah@example.com', phone: '098-765-4321', assignedCourses: 'Science', lastLogin: '2025-07-20', accessManagement: true, deleteUpdate: false, isEditing: false },
        { names: 'Michael Lee', email: 'michael@example.com', phone: '555-555-5555', assignedCourses: 'History', lastLogin: '2025-07-10', accessManagement: false, deleteUpdate: true, isEditing: false },
    ]);

    const [filters, setFilters] = useState({ course: '', access: '' });
    const [searchQuery, setSearchQuery] = useState('');

    const handleToggle = (index, field) => {
        const newData = [...data];
        newData[index][field] = !newData[index][field];
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

    const handleDropdownChange = (index, field, value) => {
        const newData = [...data];
        newData[index][field] = value;
        setData(newData);
    };

    const filteredData = useMemo(() => {
        return data.filter((row) => {
            const matchesSearch =
                row.names.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.phone.includes(searchQuery);

            const matchesCourse = filters.course ? row.assignedCourses === filters.course : true;
            const matchesAccess =
                filters.access === ''
                    ? true
                    : filters.access === 'true'
                        ? row.accessManagement
                        : !row.accessManagement;

            return matchesSearch && matchesCourse && matchesAccess;
        });
    }, [data, filters, searchQuery]);

    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-white to-gray-50">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <FiUser className="text-blue-500" /> Teacher Management
            </h2>

            {/* Filters and Search Bar with Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <select
                        value={filters.course}
                        onChange={(e) => handleFilterChange('course', e.target.value)}
                        className="p-2 border rounded bg-white text-sm focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">All Courses</option>
                        <option value="Math">Math</option>
                        <option value="Science">Science</option>
                        <option value="History">History</option>
                    </select>

                    <select
                        value={filters.access}
                        onChange={(e) => handleFilterChange('access', e.target.value)}
                        className="p-2 border rounded bg-white text-sm focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">All Access</option>
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                    </select>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Teachers..."
                            className="w-full pl-10 pr-4 py-2 border rounded bg-white text-sm focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <button
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
                        onClick={() => alert('Course Assignment functionality')}
                    >
                        Course Assignment
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto shadow-xl rounded-xl bg-white border border-gray-200">
                <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0">
                    <thead className="bg-gray-100">
                        <tr>
                            {['Name', 'Email', 'Phone', 'Assigned', 'Last Login', 'Access', 'Actions'].map((header, index) => (
                                <th
                                    key={index}
                                    className="p-4 text-center text-gray-600 text-sm font-semibold border-b border-r border-gray-300"
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
                                    className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors"
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
                                            <div className="flex justify-center items-center gap-2 text-sm text-gray-700">
                                                <FiUser className="text-blue-500" />
                                                {row.names}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center text-sm text-gray-600">
                                        {row.isEditing ? (
                                            <input
                                                value={row.email}
                                                onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                                                className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        ) : (
                                            <div className="flex justify-center items-center gap-2">
                                                <FiMail className="text-purple-400" />
                                                {row.email}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center text-sm text-gray-600">
                                        {row.isEditing ? (
                                            <input
                                                value={row.phone}
                                                onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                                                className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        ) : (
                                            <div className="flex justify-center items-center gap-2">
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
                                    <td className="p-4 text-center text-sm text-gray-600">{row.lastLogin}</td>
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
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-3">
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
                                        </div>
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
