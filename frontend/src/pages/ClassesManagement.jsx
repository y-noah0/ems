import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import adminService from '../services/adminService';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiLoader } from 'react-icons/fi';

const ClassesManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    level: 'L3',
    trade: 'SOD',
    year: new Date().getFullYear(),
    term: 1,
  });
  const [editingClass, setEditingClass] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const classesData = await adminService.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' || name === 'term' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      if (editingClass) {
        await adminService.updateClass(editingClass._id, formData);
        setFormSuccess('Class updated successfully!');
      } else {
        await adminService.createClass(formData);
        setFormSuccess('Class created successfully!');
      }
      handleCancel();
      fetchClasses();
    } catch (error) {
      setFormError(error.message || 'Failed to save class');
    }
  };

  const handleEdit = (cls) => {
    setFormData({
      level: cls.level,
      trade: cls.trade,
      year: cls.year,
      term: cls.term,
    });
    setEditingClass(cls);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await adminService.deleteClass(id);
        fetchClasses();
      } catch (error) {
        setError(error.message || 'Failed to delete class');
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      level: 'L3',
      trade: 'SOD',
      year: new Date().getFullYear(),
      term: 1,
    });
    setEditingClass(null);
    setShowForm(false);
    setFormError('');
    setFormSuccess('');
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Manage Classes</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="primary" icon={<FiPlus />}>
            Add New Class
          </Button>
        )}
      </div>

      {formSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md"
        >
          {formSuccess}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md"
        >
          {error}
        </motion.div>
      )}

      {showForm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">{editingClass ? 'Edit Class' : 'Add New Class'}</h2>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-500"
                    required
                  >
                    <option value="L3">L3</option>
                    <option value="L4">L4</option>
                    <option value="L5">L5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
                  <select
                    name="trade"
                    value={formData.trade}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-500"
                    required
                  >
                    <option value="SOD">SOD</option>
                    <option value="NIT">NIT</option>
                    <option value="MMP">MMP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <Input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    min="2000"
                    max="2100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                  <select
                    name="term"
                    value={formData.term}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-500"
                    required
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editingClass ? 'Update Class' : 'Create Class'}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <Card>
        <h2 className="text-xl font-semibold mb-4">Classes List</h2>
        {loading ? (
          <div className="flex justify-center items-center py-10 text-blue-500">
            <FiLoader className="animate-spin text-3xl" />
          </div>
        ) : classes.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No classes available. Create your first class!</p>
        ) : (
          <div className="overflow-x-auto">
            <motion.table
              className="min-w-full divide-y divide-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Term</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {classes.map((cls) => (
                  <motion.tr
                    key={cls._id}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 100 }}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{cls.level}{cls.trade}</td>
                    <td className="px-4 py-3 text-gray-700">{cls.year}</td>
                    <td className="px-4 py-3 text-gray-700">{cls.term}</td>
                    <td className="px-4 py-3 text-gray-700">--</td>
                    <td className="px-4 py-3 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(cls)} icon={<FiEdit />}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(cls._id)} icon={<FiTrash2 />}>
                        Delete
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </motion.table>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default ClassesManagement;
