import React, { Component } from 'react';
import { FiX, FiUser, FiMail, FiPhone, FiKey, FiBook } from 'react-icons/fi';
import { getTerms } from '../../services/termService';

class AddStudentModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      terms: [],
      errors: {},
      isSubmitting: false,
      studentData: {
        fullName: '',
        email: '',
        phoneNumber: '',
        parentFullName: '',
        parentNationalId: '',
        parentPhoneNumber: '',
        classId: props.selectedClass?._id || '',
        schoolId: props.currentUser?.school || '',
        termId: '',
        role: 'student',
        password: ''
      }
    };
  }

  componentDidMount() {
    if (this.props.selectedClass && this.props.currentUser) {
      this.setState(prevState => ({
        studentData: {
          ...prevState.studentData,
          classId: this.props.selectedClass._id,
          schoolId: this.props.currentUser.school
        }
      }));
    }

    if (this.props.currentUser?.school) {
      this.fetchTerms();
    }
  }

  componentDidUpdate(prevProps) {
    if (
      (this.props.selectedClass !== prevProps.selectedClass) ||
      (this.props.currentUser !== prevProps.currentUser)
    ) {
      this.setState(prevState => ({
        studentData: {
          ...prevState.studentData,
          classId: this.props.selectedClass?._id || '',
          schoolId: this.props.currentUser?.school || ''
        }
      }));
    }
  }

  fetchTerms = async () => {
    try {
      const res = await getTerms(this.props.currentUser.school);
      this.setState({ terms: res.terms || [] });
    } catch (error) {
      this.setState({ terms: [] });
      console.error('Error fetching terms:', error);
    }
  };

  validateForm = () => {
    const { studentData } = this.state;
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
    if (studentData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!studentData.termId) newErrors.termId = 'Please select a term';

    this.setState({ errors: newErrors });
    return Object.keys(newErrors).length === 0;
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState(prevState => ({
      studentData: {
        ...prevState.studentData,
        [name]: value
      },
      errors: {
        ...prevState.errors,
        [name]: '' // Clear error when user starts typing
      }
    }));
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    if (!this.validateForm()) return;

    this.setState({ isSubmitting: true });

    try {
      await this.props.register(this.state.studentData);
      alert('Student registered successfully!');
      this.props.onClose();
      if (this.props.onRegistered) this.props.onRegistered();
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message || 'Failed to register student');
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    const { onClose } = this.props;
    const { terms, studentData, errors, isSubmitting } = this.state;

    return (
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-xl animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Register New Student</h2>
              <p className="text-sm text-gray-500">
                {this.props.selectedClass ? `Class: ${this.props.selectedClass.className}` : 'Select a class first'}
              </p>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-gray-500 hover:text-red-500 bg-gray-100 hover:bg-red-100 rounded-full h-9 w-9 flex items-center justify-center transition"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={this.handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Student Information */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <FiUser size={14} /> Full Name
                </label>
                <input
                  name="fullName"
                  value={studentData.fullName}
                  onChange={this.handleChange}
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
                  onChange={this.handleChange}
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
                  onChange={this.handleChange}
                  placeholder="1234567890"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                    errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.phoneNumber && <p className="text-red-500 text-xs">{errors.phoneNumber}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <FiKey size={14} /> Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={studentData.password}
                  onChange={this.handleChange}
                  placeholder="••••••"
                  minLength={6}
                  
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
              </div>

              {/* Parent Information */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Parent Full Name</label>
                <input
                  name="parentFullName"
                  value={studentData.parentFullName}
                  onChange={this.handleChange}
                  placeholder="Parent's name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Parent National ID</label>
                <input
                  name="parentNationalId"
                  value={studentData.parentNationalId}
                  onChange={this.handleChange}
                  placeholder="National ID number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Parent Phone Number</label>
                <input
                  name="parentPhoneNumber"
                  value={studentData.parentPhoneNumber}
                  onChange={this.handleChange}
                  placeholder="1234567890"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                    errors.parentPhoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.parentPhoneNumber && <p className="text-red-500 text-xs">{errors.parentPhoneNumber}</p>}
              </div>

              {/* Term Selection */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <FiBook size={14} /> Term
                </label>
                <select
                  name="termId"
                  value={studentData.termId}
                  onChange={this.handleChange}
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

            {/* Submit Button */}
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

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              All fields are required except phone numbers and parent information. 
              The system will generate a default password if none is provided.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default AddStudentModal;