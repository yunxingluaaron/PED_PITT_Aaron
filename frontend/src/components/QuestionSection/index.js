//frontend\src\components\QuestionSection\index.js

import React, { useState, useEffect } from 'react';
import QuestionInput from './QuestionInput';
import DropdownMenu from './DropdownMenu';
import { generateAnswer } from '../../services/questionApi';

const QuestionSection = ({ onAnswerGenerated }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownValues, setDropdownValues] = useState({
    menu1: '',
    menu2: '',
    menu3: '',
    menu4: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    console.log('Current token:', token); // Check if token exists
  }, []);

  const handleQuestionSubmit = async (value) => {
    console.log('QuestionSection - handleQuestionSubmit called with:', value); // Debug log
    if (!value.trim() || loading) {
      console.log('QuestionSection - Validation failed', { value, loading }); // Debug log
      return;
    }

    setLoading(true);
    try {
      console.log('QuestionSection - Calling generateAnswer'); // Debug log
      const response = await generateAnswer({
        message: value
      });

      console.log('QuestionSection - Response received:', response); // Debug log
      if (onAnswerGenerated) {
        onAnswerGenerated(response.detail_response

        );
      }

      setQuestion('');
    } catch (error) {
      console.error('QuestionSection - Error:', error);
    } finally {
      setLoading(false);
    }
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
        value={question}
        onChange={(newValue) => {
          console.log('QuestionSection - Question changed:', newValue); // Debug log
          setQuestion(newValue);
        }}
        onSubmit={handleQuestionSubmit}
        loading={loading}
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