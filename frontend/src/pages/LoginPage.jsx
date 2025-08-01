import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { HiUser, HiLockClosed, HiArrowRight, HiExclamationCircle } from 'react-icons/hi';
import { FaSpinner } from 'react-icons/fa';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      console.log('Calling login with:', formData.identifier, formData.password);
      const user = await login(formData.identifier, formData.password);
      console.log('User returned from login:', user);

      if (!user) {
        throw new Error('Login failed: no user data returned');
      }

      if (user.role === 'student') {
        navigate('/student/dashboard');
      } else if (user.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (user.role === 'dean') {
        navigate('/dean/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid login credentials');
      console.error('Login error:', err);
      if (err.message == "Email not verified") {
        navigate('/verify-email');
      }else if (err.message == "2FA code required") {
        navigate('/two-factor');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-blue-100 to-purple-100 py-12 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="max-w-md w-full space-y-8 transform transition-all duration-700 ease-out animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <svg className="w-16 h-16 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight animate-slide-in-down">
            School Exam System
          </h1>
          <h2 className="mt-3 text-xl font-medium text-gray-600 animate-slide-in-down delay-100">
            Sign in to your account
          </h2>
        </div>

        <Card className="mt-8 shadow-xl rounded-2xl bg-white/95 backdrop-blur-md animate-slide-in-up">
          {error && (
            <div
              className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center transform transition-all duration-300 animate-error-shake"
              role="alert"
            >
              <HiExclamationCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <Input
                label="Email or Full Name"
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                value={formData.identifier}
                onChange={handleChange}
                placeholder="Enter your email or full name"
                containerClassName="transition-all duration-300"
                inputClassName="pl-12 pr-4 py-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all duration-300 text-gray-900"
                labelClassName="text-gray-800 font-semibold"
              />
              <HiUser className="absolute left-4 top-11 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
            </div>

            <div className="relative group">
              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                containerClassName="transition-all duration-300"
                inputClassName="pl-12 pr-4 py-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all duration-300 text-gray-900"
                labelClassName="text-gray-800 font-semibold"
              />
              <HiLockClosed className="absolute left-4 top-11 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-all duration-200"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
              className={`relative flex items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg rounded-lg ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700'
                }`}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="w-5 h-5 mr-2 animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  <HiArrowRight className="w-5 h-5 mr-2" /> Sign In
                </>
              )}
            </Button>
          </form>
        </Card>

        <div className="text-center mt-6 animate-slide-in-up delay-200">
          <p className="text-sm text-gray-600">
            Need access?{' '}
            <a
              href="#"
              className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-200 hover:underline"
            >
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;