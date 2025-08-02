import React, { useState } from 'react';
import { FiEdit, FiTrash2, FiUser, FiMail, FiPhoneCall } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherManagementTableNew = () => {
    const [data, setData] = useState([
        { names: 'John Fuwag', email: '0772', phone: '123-456-7890', assignedCourses: '', lastLogin: '2025-07-15', accessManagement: false, deleteUpdate: false, isEditing: false },
        { names: 'Sarah Kim', email: '0888', phone: '098-765-4321', assignedCourses: '', lastLogin: '2025-07-20', accessManagement: true, deleteUpdate: false, isEditing: false },
        { names: 'Michael Lee', email: '0999', phone: '555-555-5555', assignedCourses: '', lastLogin: '2025-07-10', accessManagement: false, deleteUpdate: true, isEditing: false },
    ]);

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

    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-white to-gray-50">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <FiUser className="text-blue-500" /> Teacher Management
            </h2>

            <div className="relative overflow-x-auto shadow-xl rounded-xl bg-white border border-gray-200">
                <table className="w-full border-collapse min-w-[900px]">
                    <thead className="bg-gray-100 text-gray-700">
                        <tr>
                            {['Names', 'Email', 'Phone', 'Assigned Courses', 'Last Login', 'Access Mgmt', 'Edit / Delete'].map((header, i) => (
                                <th key={i} className="p-4 text-sm font-semibold border border-gray-300 text-center">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        <AnimatePresence>
                            {data.map((row, index) => (
                                <motion.tr
                                    key={index}
                                    className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <td className="p-4 text-sm">
                                        {row.isEditing ? (
                                            <input
                                                value={row.names}
                                                onChange={(e) => handleInputChange(index, 'names', e.target.value)}
                                                className="w-full p-2 border rounded text-sm"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <FiUser className="text-blue-500" />
                                                {row.names}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {row.isEditing ? (
                                            <input
                                                value={row.email}
                                                onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                                                className="w-full p-2 border rounded text-sm"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <FiMail className="text-purple-400" />
                                                {row.email}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {row.isEditing ? (
                                            <input
                                                value={row.phone}
                                                onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                                                className="w-full p-2 border rounded text-sm"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <FiPhoneCall className="text-green-400" />
                                                {row.phone}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={row.assignedCourses}
                                            onChange={(e) => handleDropdownChange(index, 'assignedCourses', e.target.value)}
                                            className="w-full p-2 border rounded text-sm bg-white"
                                            disabled={row.isEditing}
                                        >
                                            <option value="">Select</option>
                                            <option value="Math">Math</option>
                                            <option value="Science">Science</option>
                                            <option value="History">History</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{row.lastLogin}</td>
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
                                            className="text-blue-500 hover:text-blue-700 hover:scale-110 transition-transform"
                                        >
                                            <FiEdit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="text-red-500 hover:text-red-700 hover:scale-110 transition-transform"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>

                <div className="absolute top-0 left-0 text-xs text-gray-400 bg-white px-3 py-1 rounded-br-lg border-r border-b">
                    page manage → entry control
                </div>
            </div>
        </div>
    );
};

export default TeacherManagementTableNew;
