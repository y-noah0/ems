// src/components/ui/Button.jsx
import React from 'react';

const Button = ({ 
  children,
  variant = 'primary',
  size = 'md',
  as = 'button',
  fullWidth = false,  // Add this prop
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-md font-medium transition-all flex items-center justify-center';
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50',
    outline: 'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const widthStyle = fullWidth ? 'w-full' : '';
  
  const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`;
  
  return React.createElement(
    as,
    {
      className: buttonClasses,
      ...props
    },
    children
  );
};

export default Button;