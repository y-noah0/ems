// src/components/ui/Button.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Button = ({ 
  children,
  variant = 'primary',
  size = 'md',
  as = 'button',
  fullWidth = false,
  className = '',
  to,  // Add this prop
  ...props
}) => {
  const baseStyles = 'rounded-md font-medium transition-all flex items-center justify-center cursor-pointer';
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50',
    outline: 'bg-transparent text-sm text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  
  const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const widthStyle = fullWidth ? 'w-full' : '';
  
  const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`;
  
  // If "to" prop is provided, render Link component instead
  if (to) {
    return (
      <Link to={to} className={buttonClasses} {...props}>
        {children}
      </Link>
    );
  }
  
  // Otherwise render the specified element (default: button)
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