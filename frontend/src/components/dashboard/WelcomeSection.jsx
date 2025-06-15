import React from 'react';
import { ChevronDown } from 'lucide-react';

const WelcomeSection = ({ currentUser }) => {
  const [language, setLanguage] = React.useState('English');
  const [className, setClassName] = React.useState('P5 B');
  const [showLangDropdown, setShowLangDropdown] = React.useState(false);
  const [showClassDropdown, setShowClassDropdown] = React.useState(false);

  const languageOptions = ['English', 'French', 'Spanish'];
  const classOptions = ['P5 A', 'P5 B', 'P5 C'];

  const handleLangSelect = (option) => {
    setLanguage(option);
    setShowLangDropdown(false);
  };

  const handleClassSelect = (option) => {
    setClassName(option);
    setShowClassDropdown(false);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
        Welcome Back! <br className="block sm:hidden" /> {currentUser?.fullName || 'Dean full names'}
      </h1>
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
        {/* Language Dropdown */}
        <div className="relative w-full sm:w-auto">
          <button
            className="flex items-center justify-between w-full sm:w-auto px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            onClick={() => setShowLangDropdown((prev) => !prev)}
            type="button"
          >
            {language}
            <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
          </button>
          {showLangDropdown && (
            <div className="absolute right-0 mt-2 w-full sm:w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              <ul className="py-1">
                {languageOptions.map((option) => (
                  <li key={option}>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => handleLangSelect(option)}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {/* Class Dropdown */}
        <div className="relative w-full sm:w-auto">
          <button
            className="flex items-center justify-between w-full sm:w-auto px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            onClick={() => setShowClassDropdown((prev) => !prev)}
            type="button"
          >
            {className}
            <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
          </button>
          {showClassDropdown && (
            <div className="absolute right-0 mt-2 w-full sm:w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              <ul className="py-1">
                {classOptions.map((option) => (
                  <li key={option}>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => handleClassSelect(option)}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;



