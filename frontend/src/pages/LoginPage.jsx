import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
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
      const user = await login(formData.email, formData.password);
        // Redirect based on user role
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
    } catch (error) {
      setError(error.message || 'Invalid login credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">School Exam System</h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Sign in to your account</h2>
        </div>
        
        <Card className="mt-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4" role="alert">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
            />
            
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
            />
            
            <div className="mt-6">
              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Contact your administrator if you need access to the system.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
