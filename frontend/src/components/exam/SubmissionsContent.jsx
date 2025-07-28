import React from 'react';
import { Users } from 'lucide-react';

const SubmissionsContent = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 p-4 sm:p-6">
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
          <p className="text-sm text-gray-500 max-w-sm">Student submissions will appear here once the exam is started.</p>
          <h1>see</h1>
        </div>
      </div>
    </div>
  );
};

export default SubmissionsContent;