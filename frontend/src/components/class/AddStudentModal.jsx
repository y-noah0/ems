// components/AddStudentModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import tradeService from '../../services/tradeService';

const AddStudentModal = ({ onClose, selectedClass, currentUser, onRegistered }) => {
  const [studentData, setStudentData] = useState({
    fullName: '',
    registrationNumber: '',
    passwordHash: '',
    phoneNumber: '',
    parentFullName: '',
    parentNationalId: '',
    parentPhoneNumber: '',
    classId: '',
    school: '',
    role: 'student',
  });

  useEffect(() => {
    if (selectedClass && currentUser) {
      setStudentData((prev) => ({
        ...prev,
        classId: selectedClass._id,
        school: currentUser.school,
      }));
    }
  }, [selectedClass, currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudentData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await tradeService.register(studentData);
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
      className="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-lg p-8 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-blue-700">Register Student</h2>
          <button
            className="text-gray-500 hover:text-gray-700 bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center"
            onClick={onClose}
          >
            <FiX size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="fullName" onChange={handleChange} value={studentData.fullName} placeholder="Full Name" className="input-style" required />
          <input name="registrationNumber" onChange={handleChange} value={studentData.registrationNumber} placeholder="Registration No" className="input-style" required />
          <input name="passwordHash" onChange={handleChange} value={studentData.passwordHash} placeholder="Password" type="password" className="input-style" required />
          <input name="phoneNumber" onChange={handleChange} value={studentData.phoneNumber} placeholder="Phone Number" className="input-style" />
          <input name="parentFullName" onChange={handleChange} value={studentData.parentFullName} placeholder="Parent Full Name" className="input-style" />
          <input name="parentNationalId" onChange={handleChange} value={studentData.parentNationalId} placeholder="Parent National ID" className="input-style" />
          <input name="parentPhoneNumber" onChange={handleChange} value={studentData.parentPhoneNumber} placeholder="Parent Phone Number" className="input-style" />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded font-semibold"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;
