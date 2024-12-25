// src/components/QuestionSection/index.js
import React, { useState } from 'react';
import QuestionInput from './QuestionInput';
import DropdownMenu from './DropdownMenu';
import { submitQuestion } from '../../services/questionApi';

const QuestionSection = () => {
  const [questionInput, setQuestionInput] = useState('');
  const [dropdownValues, setDropdownValues] = useState({
    menu1: '',
    menu2: '',
    menu3: '',
    menu4: ''
  });

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    await submitQuestion(questionInput);
  };

  const handleDropdownChange = (menu) => (e) => {
    setDropdownValues(prev => ({
      ...prev,
      [menu]: e.target.value
    }));
  };

  const dropdownMenus = [
    { id: 'menu1', label: 'Dropdown menu 1', options: [/* your options */] },
    { id: 'menu2', label: 'Dropdown menu 2', options: [/* your options */] },
    { id: 'menu3', label: 'Dropdown menu 3', options: [/* your options */] },
    { id: 'menu4', label: 'Dropdown menu 4', options: [/* your options */] }
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Questions Enter</h2>
      <QuestionInput
        value={questionInput}
        onChange={(e) => setQuestionInput(e.target.value)}
        onSubmit={handleQuestionSubmit}
      />
      <div className="mt-4 flex gap-2">
        {dropdownMenus.map(menu => (
          <DropdownMenu
            key={menu.id}
            label={menu.label}
            options={menu.options}
            value={dropdownValues[menu.id]}
            onChange={handleDropdownChange(menu.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionSection;