// src/components/QuestionSection/DropdownMenu.js
import React from 'react';

const DropdownMenu = ({ 
  label, 
  options, 
  value, 
  onChange, 
  disabled = false 
}) => {
  return (
    <div className="flex flex-col min-w-[150px]">
      <label className="text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          border border-gray-300 
          p-2 rounded-lg 
          bg-white
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          text-sm
          ${disabled ? 'opacity-60' : 'opacity-100'}
        `}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DropdownMenu;