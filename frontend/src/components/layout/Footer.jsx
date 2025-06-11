import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t py-4 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-500">
          <p>
            &copy; {currentYear} School Exam System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
