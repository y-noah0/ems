import React, { useState, useEffect } from 'react';
import {
  FiX, FiUser, FiPhone, FiMail, FiKey, FiUsers
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getTerms } from '../../services/termService';

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
    password: ''
  });

  useEffect(() => {
    if (selectedClass && currentUser) {
      setStudentData((prev) => ({
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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl p-8 relative shadow-2xl border border-blue-300 transition-all transform scale-100 hover:scale-[1.01] duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-2xl font-bold text-blue-700">🎓 Register New Student</h2>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-500 hover:text-red-500 bg-gray-100 hover:bg-red-100 rounded-full h-8 w-8 flex items-center justify-center transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput icon={<FiUser />} name="fullName" value={studentData.fullName} onChange={handleChange} placeholder="Full Name" required />
            <FormInput icon={<FiMail />} type="email" name="email" value={studentData.email} onChange={handleChange} placeholder="Email" required />
            <FormInput icon={<FiPhone />} name="phoneNumber" value={studentData.phoneNumber} onChange={handleChange} placeholder="Phone Number" />
            <FormInput icon={<FiUsers />} name="parentFullName" value={studentData.parentFullName} onChange={handleChange} placeholder="Parent Full Name" />
            <FormInput icon={<FiKey />} name="parentNationalId" value={studentData.parentNationalId} onChange={handleChange} placeholder="Parent National ID" />
            <FormInput icon={<FiPhone />} name="parentPhoneNumber" value={studentData.parentPhoneNumber} onChange={handleChange} placeholder="Parent Phone Number" />
            <FormInput icon={<FiKey />} type="password" name="password" value={studentData.password} onChange={handleChange} placeholder="Password" minLength={6} required />

            <div className="relative">
              <select
                name="termId"
                value={studentData.termId}
                onChange={handleChange}
                className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-md text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Term</option>
                {terms.map((term) => (
                  <option key={term._id} value={term._id}>
                    Term {term.termNumber}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                📘
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-all duration-300"
          >
            Register Student
          </button>
        </form>

        {/* Note */}
        <p className="mt-4 text-sm text-gray-500 italic">
          Make sure all required fields are filled. Password must be at least 6 characters.
        </p>
      </div>
    </div>
  );
};

export default AddStudentModal;

// Reusable input with icon and enhanced styles
const FormInput = ({ icon, ...props }) => (
  <div className="relative">
    <input
      {...props}
      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200"
    />
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
      {icon}
    </span>
  </div>
);
