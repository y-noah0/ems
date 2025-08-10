import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiMail, FiPhone, FiKey, FiBook } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getTerms } from '../../services/termService';
import authService from '../../services/authService';

const AddStudentModal = ({ onClose, selectedClass, onRegistered }) => {
  const { currentUser } = useAuth();
  const [terms, setTerms] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [studentData, setStudentData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    parentFullName: '',
    parentNationalId: '',
    parentPhoneNumber: '',
    classId: selectedClass?._id || '',
    schoolId: currentUser?.school || '',
    termId: '',
    role: 'student',
  });

  useEffect(() => {
    if (selectedClass && currentUser) {
      setStudentData(prev => ({
        ...prev,
        classId: selectedClass._id,
        schoolId: currentUser.school
      }));
    }
  }, [selectedClass, currentUser]);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await getTerms(currentUser.school);
        setTerms(res.terms || []);
      } catch {
        setTerms([]);
      }
    };
    if (currentUser?.school) fetchTerms();
  }, [currentUser]);

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,15}$/;
    
    if (!studentData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!emailRegex.test(studentData.email)) newErrors.email = 'Invalid email format';
    if (studentData.phoneNumber && !phoneRegex.test(studentData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number';
    }
    if (studentData.parentPhoneNumber && !phoneRegex.test(studentData.parentPhoneNumber)) {
      newErrors.parentPhoneNumber = 'Invalid phone number';
    }
   
    if (!studentData.termId) newErrors.termId = 'Please select a term';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudentData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await authService.register(studentData);
      alert('Student registered successfully!');
      onClose();
      if (onRegistered) onRegistered();
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message || 'Failed to register student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-xl">
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Register New Student</h2>
            <p className="text-sm text-gray-500">
              {selectedClass ? `Class: ${selectedClass.className}` : 'Select a class first'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 bg-gray-100 hover:bg-red-100 rounded-full h-9 w-9 flex items-center justify-center transition"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <FiUser size={14} /> Full Name
              </label>
              <input
                name="fullName"
                value={studentData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  errors.fullName ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <FiMail size={14} /> Email
              </label>
              <input
                type="email"
                name="email"
                value={studentData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <FiPhone size={14} /> Phone Number
              </label>
              <input
                name="phoneNumber"
                value={studentData.phoneNumber}
                onChange={handleChange}
                placeholder="1234567890"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.phoneNumber && <p className="text-red-500 text-xs">{errors.phoneNumber}</p>}
            </div>

            

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Parent Full Name</label>
              <input
                name="parentFullName"
                value={studentData.parentFullName}
                onChange={handleChange}
                placeholder="Parent's name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Parent National ID</label>
              <input
                name="parentNationalId"
                value={studentData.parentNationalId}
                onChange={handleChange}
                placeholder="National ID number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Parent Phone Number</label>
              <input
                name="parentPhoneNumber"
                value={studentData.parentPhoneNumber}
                onChange={handleChange}
                placeholder="1234567890"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  errors.parentPhoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.parentPhoneNumber && <p className="text-red-500 text-xs">{errors.parentPhoneNumber}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <FiBook size={14} /> Term
              </label>
              <select
                name="termId"
                value={studentData.termId}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  errors.termId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select Term</option>
                {terms.map((term) => (
                  <option key={term._id} value={term._id}>
                    Term {term.termNumber} ({new Date(term.startDate).getFullYear()})
                  </option>
                ))}
              </select>
              {errors.termId && <p className="text-red-500 text-xs">{errors.termId}</p>}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold shadow-md transition flex items-center justify-center ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </>
              ) : (
                'Register Student'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            All fields are required except phone numbers and parent information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;