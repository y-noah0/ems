import React from 'react';
import { Link } from 'react-router-dom';

const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  className = '',
  disabled = false,
  fullWidth = false,
  as,
  to,
  href,
  size = 'md',
  ...rest
}) => {
  // Base classes for all buttons
  const baseClasses = 'rounded-md font-medium focus:outline-none transition-colors duration-300';
  
  // Classes based on variant
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700  focus:ring-blue-500 focus:ring-opacity-50',
    secondary: 'bg-transparent border border-black/25 text-gray-800 hover:bg-gray-100  focus:ring-gray-500 focus:ring-opacity-50',
    success: 'bg-green-600 text-white hover:bg-green-700  focus:ring-green-500 focus:ring-opacity-50',
    danger: 'bg-red-600 text-white hover:bg-red-700  focus:ring-red-500 focus:ring-opacity-50',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600  focus:ring-yellow-500 focus:ring-opacity-50',
    info: 'bg-cyan-600 text-white hover:bg-cyan-700  focus:ring-cyan-500 focus:ring-opacity-50',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    link: 'bg-transparent text-blue-600 hover:underline p-0 focus:ring-0'
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  // Disabled state
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  // Full width option
  const widthClasses = fullWidth ? 'w-full' : '';
  
  // Combined classes
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${widthClasses} ${className}`;  // If as prop is provided and it's Link from react-router-dom
  if (as === Link && to) {
    // If disabled, prevent navigation
    const handleClick = (e) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      if (onClick) onClick(e);
    };

    return (
      <Link 
        to={to}
        className={combinedClasses} 
        onClick={handleClick}
        style={disabled ? { pointerEvents: 'none' } : {}}
        {...rest}
      >
        {children}
      </Link>
    );
  }
  
  // If as prop is provided but it's something else
  if (as) {
    const Component = as;
    return (
      <Component 
        className={combinedClasses} 
        onClick={onClick}
        disabled={disabled}
        {...rest}
      >
        {children}
      </Component>
    );
  }
    // If to prop is provided, render as Link
  if (to) {
    // If disabled, prevent navigation
    const handleClick = (e) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      if (onClick) onClick(e);
    };

    return (
      <Link
        to={to}
        className={combinedClasses}
        onClick={handleClick}
        style={disabled ? { pointerEvents: 'none' } : {}}
        {...rest}
      >
        {children}
      </Link>
    );
  }
  
  // If href prop is provided, render as anchor
  if (href) {
    return (
      <a
        href={href}
        className={combinedClasses}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }
  
  // Default: render as button
  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
export default Button
