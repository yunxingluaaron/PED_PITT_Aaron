import React from 'react';

const DropdownMenu = ({ label, options, value, onChange }) => {
  return (
    <select 
      value={value}
      onChange={onChange}
      className="border border-gray-300 p-2 rounded-lg focus:ring-2 
        focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">{label}</option>
      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default DropdownMenu;