import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft } from 'lucide-react';

const BackButton = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <button 
      onClick={handleBack}
      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 border-black/10 border h-9 px-3 rounded-lg"
    >
      <ChevronLeft className="w-5 h-5" />
      <span className="text-sm font-medium hidden sm:inline">Back</span>
    </button>
  );
};

export default BackButton;