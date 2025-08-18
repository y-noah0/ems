import React, { useState } from 'react';
import { FiX, FiHash, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import termService from '../../services/termService';

const AddTermModel = ({ onClose, onAdded }) => {
  const { currentUser } = useAuth();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [termData, setTermData] = useState({
    termNumber: '',
    academicYear: '',
    startDate: '',
    endDate: '',
    school: currentUser?.school || '',
  });

  const validateForm = () => {
    const newErrors = {};
    if (!termData.termNumber) newErrors.termNumber = 'Term number is required';
    if (!termData.academicYear) newErrors.academicYear = 'Academic year is required';
    if (!termData.startDate) newErrors.startDate = 'Start date is required';
    if (!termData.endDate) newErrors.endDate = 'End date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTermData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await termService.createTerm(termData);
      alert('Term added successfully!');
      onClose();
      if (onAdded) onAdded();
    } catch (error) {
      console.error('Error adding term:', error);
      alert(error.message || 'Failed to add term');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative shadow-xl">
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Add New Term</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 bg-gray-100 hover:bg-red-100 rounded-full h-9 w-9 flex items-center justify-center transition"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <FiHash size={14} /> Term Number
            </label>
            <input
              type="number"
              name="termNumber"
              value={termData.termNumber}
              onChange={handleChange}
              placeholder="e.g., 1"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                errors.termNumber ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.termNumber && <p className="text-red-500 text-xs">{errors.termNumber}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Academic Year</label>
            <input
              type="text"
              name="academicYear"
              value={termData.academicYear}
              onChange={handleChange}
              placeholder="e.g., 2025"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                errors.academicYear ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.academicYear && <p className="text-red-500 text-xs">{errors.academicYear}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <FiCalendar size={14} /> Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={termData.startDate}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startDate && <p className="text-red-500 text-xs">{errors.startDate}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <FiCalendar size={14} /> End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={termData.endDate}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endDate && <p className="text-red-500 text-xs">{errors.endDate}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold shadow-md transition ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Term'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTermModel;
