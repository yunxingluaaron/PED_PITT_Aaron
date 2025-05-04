// src/components/QuestionSection/DropdownMenu.js
import React from 'react';

const DropdownMenu = ({ options, value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default DropdownMenu;