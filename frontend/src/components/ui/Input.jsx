import React from 'react';

const Input = ({ 
  label,
  type = 'text',
  id,
  name,
  value,
  onChange,
  placeholder = '',
  error,
  disabled = false,
  required = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  containerClassName = '',
  ...rest
}) => {
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={id} 
          className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        className={`appearance-none block w-full px-3 py-2 border ${
          error ? 'border-red-300' : 'border-gray-300'
        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          disabled ? 'bg-gray-100 text-gray-500' : ''
        } ${inputClassName}`}
        {...rest}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Input;
