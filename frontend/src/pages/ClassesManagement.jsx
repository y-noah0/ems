import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import adminService from '../services/adminService';

const ClassesManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    level: 'L3',
    trade: 'SOD',
    year: new Date().getFullYear(),
    term: 1
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
      console.error('Error fetching classes:', error);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' || name === 'term' ? parseInt(value, 10) : value
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
      
      // Reset form and refresh classes
      setFormData({
        level: 'L3',
        trade: 'SOD',
        year: new Date().getFullYear(),
        term: 1
      });
      setEditingClass(null);
      setShowForm(false);
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      setFormError(error.message || 'Failed to save class');
    }
  };

  const handleEdit = (classObj) => {
    setFormData({
      level: classObj.level,
      trade: classObj.trade,
      year: classObj.year,
      term: classObj.term
    });
    setEditingClass(classObj);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }
    
    try {
      await adminService.deleteClass(id);
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      setError(error.message || 'Failed to delete class');
    }
  };

  const handleCancel = () => {
    setFormData({
      level: 'L3',
      trade: 'SOD',
      year: new Date().getFullYear(),
      term: 1
    });
    setEditingClass(null);
    setShowForm(false);
    setFormError('');
    setFormSuccess('');
  };

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Classes</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="primary">
            Add New Class
          </Button>
        )}
      </div>

      {formSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {formSuccess}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingClass ? 'Edit Class' : 'Add New Class'}
          </h2>
          
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingClass ? 'Update Class' : 'Create Class'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-semibold mb-4">Classes List</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : classes.length === 0 ? (
          <p className="text-gray-500">No classes available. Create your first class!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Term
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.map((cls) => (
                  <tr key={cls._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cls.level}{cls.trade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cls.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cls.term}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* This will be filled when the API for counting students is added */}
                      --
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(cls)}>
                        Edit
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleDelete(cls._id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default ClassesManagement;
