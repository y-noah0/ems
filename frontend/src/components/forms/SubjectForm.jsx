import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import subjectService from '../../services/subjectService';
import tradeService from '../../services/tradeService';
import schoolService from '../../services/schoolService';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { ToastContext } from '../../context/ToastContext';

export default function SubjectForm({ 
  subjectId = null, 
  onClose, 
  onCreate, 
  onUpdate 
}) {
  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);
  const isEditing = Boolean(subjectId);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    school: '',
    trades: [],
    credits: 1
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [schools, setSchools] = useState([]);
  const [tradesList, setTradesList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolsRes, tradesRes] = await Promise.all([
          schoolService.getAllSchools(),
          tradeService.getAllTrades()
        ]);
        setSchools(schoolsRes);
        setTradesList(tradesRes);

        // If editing, fetch the subject data
        if (isEditing) {
          setIsLoading(true);
          const subjectData = await subjectService.getSubjectById(subjectId);
          setFormData({
            name: subjectData.name || '',
            description: subjectData.description || '',
            school: subjectData.school?._id || subjectData.school || '',
            trades: subjectData.trades?.map(trade => trade._id) || [],
            credits: subjectData.credits || 1
          });
          setIsLoading(false);
        }
      } catch (error) {
        showToast(`Failed to load data: ${error.message}`, "error");
        if (isEditing) {
          navigate('/admin/subjects');
        }
      }
    };
    fetchData();
  }, [showToast, isEditing, subjectId, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleTradesChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      trades: checked
        ? [...prev.trades, value]
        : prev.trades.filter(id => id !== value)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Subject name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.school) newErrors.school = 'School is required';
    if (formData.credits < 1) newErrors.credits = 'Credits must be at least 1';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        school: formData.school,
        trades: formData.trades,
        credits: formData.credits
      };
      
      let result;
      if (isEditing) {
        result = await subjectService.updateSubject(subjectId, payload);
        showToast('Subject updated successfully!', 'success');
        if (onUpdate) onUpdate(result);
      } else {
        result = await subjectService.createSubject(payload);
        showToast('Subject created successfully!', 'success');
        if (onCreate) onCreate(result);
      }
      
      if (onClose) onClose();
      
      // Navigate back to subjects catalog
      navigate('/admin/subjects');
    } catch (error) {
      showToast(`Error ${isEditing ? 'updating' : 'creating'} subject: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/admin/subjects');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-6 py-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Subject' : 'Add New Subject'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing 
              ? 'Update the subject information below'
              : 'Create a new subject for the curriculum'
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Subject Information</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Subject Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Mathematics, English Language"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* School Selection */}
            <div>
              <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
                School *
              </label>
              <select
                id="school"
                name="school"
                value={formData.school}
                onChange={handleInputChange}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.school ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a school</option>
                {schools.map((school) => (
                  <option key={school._id} value={school._id}>
                    {school.name}
                  </option>
                ))}
              </select>
              {errors.school && <p className="text-red-500 text-sm mt-1">{errors.school}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Provide a detailed description of the subject..."
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Credits */}
            <div>
              <label htmlFor="credits" className="block text-sm font-medium text-gray-700 mb-2">
                Credits
              </label>
              <input
                type="number"
                id="credits"
                name="credits"
                value={formData.credits}
                onChange={handleInputChange}
                min="1"
                className={`w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.credits ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.credits && <p className="text-red-500 text-sm mt-1">{errors.credits}</p>}
            </div>

            {/* Trades Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Associated Trades (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {tradesList.map((trade) => (
                  <label key={trade._id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={trade._id}
                      checked={formData.trades.includes(trade._id)}
                      onChange={handleTradesChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{trade.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
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
                  : (isEditing ? 'Update Subject' : 'Create Subject')
                }
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
