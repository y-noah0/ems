import React from 'react';
import { ArrowLeft } from 'lucide-react';

const BackButton = () => {
  return (
    <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200">
      <ArrowLeft className="w-4 h-4" />
      <span className="text-sm font-medium hidden sm:inline">Back</span>
    </button>
  );
};

export default BackButton;