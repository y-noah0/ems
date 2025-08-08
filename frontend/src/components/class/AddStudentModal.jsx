// components/AddStudentModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import {getTerms} from '../../services/termService';

const AddStudentModal = ({ onClose, selectedClass, onRegistered }) => {
  const { register, currentUser } = useAuth();
  const [terms, setTerms] = useState([]);
  const [studentData, setStudentData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    parentFullName: '',
    parentNationalId: '',
    parentPhoneNumber: '',
    classId: '',
    schoolId: '',
    termId: '',
    role: 'student',
    password: '', // Add password field
  });

  useEffect(() => {
    if (selectedClass && currentUser) {
      setStudentData((prev) => ({
        ...prev,
        classId: selectedClass._id,
        schoolId: currentUser.school,
      }));
      console.log('Student data updated:', studentData);
    }
  }, [selectedClass, currentUser]);

 useEffect(() => {
  const fetchTerms = async () => {
    try {
      const res = await getTerms(currentUser.school);
      setTerms(res.terms);
    } catch {
      setTerms([]);
    }
  };
  if (currentUser?.school) fetchTerms();
}, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudentData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(studentData);
      alert('Student registered successfully.');
      onClose();
      if (onRegistered) onRegistered();
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message || 'Failed to register student');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl p-8 relative shadow-xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-xl font-bold text-blue-700">Register Student</h2>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-500 hover:text-red-500 bg-gray-100 hover:bg-red-100 rounded-full h-8 w-8 flex items-center justify-center transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              name="fullName"
              value={studentData.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              className="input-modern"
              required
            />
            <input
              type="email"
              name="email"
              value={studentData.email}
              onChange={handleChange}
              placeholder="Email"
              className="input-modern"
              required
            />
            <input
              name="phoneNumber"
              value={studentData.phoneNumber}
              onChange={handleChange}
              placeholder="Phone Number"
              className="input-modern"
            />
            <input
              name="parentFullName"
              value={studentData.parentFullName}
              onChange={handleChange}
              placeholder="Parent Full Name"
              className="input-modern"
            />
            <input
              name="parentNationalId"
              value={studentData.parentNationalId}
              onChange={handleChange}
              placeholder="Parent National ID"
              className="input-modern"
            />
            <input
              name="parentPhoneNumber"
              value={studentData.parentPhoneNumber}
              onChange={handleChange}
              placeholder="Parent Phone Number"
              className="input-modern"
            />
            <input
              type="password"
              name="password"
              value={studentData.password}
              onChange={handleChange}
              placeholder="Password"
              minLength={6}
              required
              className="input-modern"
            />
            <select
              name="termId"
              value={studentData.termId}
              onChange={handleChange}
              className="input-modern"
              required
            >
              <option value="">Select Term</option>
              {terms.map((term) => (
                <option key={term._id} value={term._id}>
                  {term.termNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold shadow-md transition"
          >
            Register
          </button>
        </form>

        {/* Note */}
        <p className="mt-4 text-sm text-gray-500 italic">
          Password must be at least 6 characters long.
        </p>
      </div>
    </div>
  );
};

export default AddStudentModal;
