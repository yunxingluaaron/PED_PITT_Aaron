// src/components/QuestionSection/index.js
import React, { useState, useEffect } from 'react';
import QuestionInput from './QuestionInput';
import DropdownMenu from './DropdownMenu';

const QuestionSection = ({ onQuestionSubmit, isGenerating }) => {
  const [question, setQuestion] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [dropdownValues, setDropdownValues] = useState({
    menu1: '',
    menu2: '',
    menu3: '',
    menu4: ''
  });

  useEffect(() => {
    // Reset local loading state when generation is complete
    if (!isGenerating && localLoading) {
      setLocalLoading(false);
    }
  }, [isGenerating]);

  const handleQuestionSubmit = async (value) => {
    if (!value.trim() || localLoading) {
      return;
    }

    setLocalLoading(true);
    try {
      await onQuestionSubmit(value);
      // Don't clear the question here - let the user decide
    } catch (error) {
      console.error('QuestionSection - Error:', error);
      setLocalLoading(false); // Reset loading on error
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
    <div className={`p-4 transition-opacity duration-200 ${localLoading || isGenerating ? 'opacity-50' : 'opacity-100'}`}>
      <h2 className="text-xl font-bold mb-4">Questions Enter</h2>
      <QuestionInput
        value={question}
        onChange={(newValue) => setQuestion(newValue)}
        onSubmit={handleQuestionSubmit}
        loading={localLoading || isGenerating}
        onClear={() => setQuestion('')}
      />
      <div className="mt-4 flex gap-2">
        {dropdownMenus.map(menu => (
          <DropdownMenu
            key={menu.id}
            label={menu.label}
            options={menu.options}
            value={dropdownValues[menu.id]}
            onChange={handleDropdownChange(menu.id)}
            disabled={localLoading || isGenerating}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionSection;