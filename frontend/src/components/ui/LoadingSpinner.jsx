import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-t-2 border-blue-300 opacity-25"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;