import React from 'react';

const Card = ({ 
  children, 
  title, 
  footer, 
  className = '', 
  headerClassName = '',
  bodyClassName = '',
  footerClassName = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className={`px-6 py-4 bg-gray-50 border-b ${headerClassName}`}>
          {typeof title === 'string' ? (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          ) : (
            title
          )}
        </div>
      )}
      
      <div className={`px-6 py-4 ${bodyClassName}`}>
        {children}
      </div>
      
      {footer && (
        <div className={`px-6 py-3 bg-gray-50 border-t ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
