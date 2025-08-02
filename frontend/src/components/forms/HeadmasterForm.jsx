import React, { useState, useContext, useEffect } from 'react';
import { ToastContext } from '../../context/ToastContext';
import userService from '../../services/userService';
import schoolService from '../../services/schoolService';
import Button from '../ui/Button';

export default function HeadmasterForm({ 
  headmasterId = null, 
  onClose, 
  onCreate, 
  onUpdate 
}) {
  const { showToast } = useContext(ToastContext);
  const isEditing = Boolean(headmasterId);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    schoolId: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch schools for the dropdown
        const schoolsRes = await schoolService.getAllSchools();
        setSchools(schoolsRes);

        // If editing, fetch the headmaster data
        if (isEditing) {
          setIsLoading(true);
          const headmasterData = await userService.getUserById(headmasterId);
          setFormData({
            fullName: headmasterData.fullName || '',
            email: headmasterData.email || '',
            password: '', // Don't pre-fill password
            phoneNumber: headmasterData.phoneNumber || '',
            schoolId: headmasterData.schoolId || ''
          });
          setIsLoading(false);
        }
      } catch (error) {
        showToast(`Failed to load data: ${error.message}`, "error");
        if (isEditing && onClose) {
          onClose();
        }
      }
    };
    fetchData();
  }, [showToast, isEditing, headmasterId, onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password is required only when creating new headmaster
    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required';
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.phoneNumber && !/^\+?\d{10,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        schoolId: formData.schoolId || null
      };

      // Add password only if provided (for new headmasters or password updates)
      if (formData.password) {
        payload.password = formData.password;
      }
      
      let result;
      if (isEditing) {
        result = await userService.updateUser(headmasterId, payload);
        showToast('Headmaster updated successfully!', 'success');
        if (onUpdate) onUpdate(result);
      } else {
        result = await userService.createHeadmaster(payload);
        showToast('Headmaster created successfully!', 'success');
        if (onCreate) onCreate(result);
      }
      
      if (onClose) onClose();
    } catch (error) {
      showToast(`Error ${isEditing ? 'updating' : 'creating'} headmaster: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Headmaster' : 'Add New Headmaster'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter full name"
            />
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password {!isEditing && '*'}
              {isEditing && <span className="text-gray-500 text-xs">(leave blank to keep current password)</span>}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={isEditing ? "Enter new password (optional)" : "Enter password"}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter phone number"
            />
            {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
          </div>

          {/* School Assignment */}
          <div>
            <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700 mb-1">
              Assign School (Optional)
            </label>
            <select
              id="schoolId"
              name="schoolId"
              value={formData.schoolId}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No school assigned</option>
              {schools.map((school) => (
                <option key={school._id} value={school._id}>
                  {school.name}
                </option>
              ))}
            </select>
            <p className="text-gray-500 text-xs mt-1">
              Schools can be assigned later if needed
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Headmaster' : 'Create Headmaster')
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
