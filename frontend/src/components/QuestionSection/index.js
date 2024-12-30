// src/components/QuestionSection/index.js
import React, { useState, useEffect, useRef } from 'react';
import QuestionInput from './QuestionInput';
import DropdownMenu from './DropdownMenu';

const QuestionSection = ({ 
  onQuestionSubmit, 
  isGenerating,
  initialQuestion,
  selectedHistoryQuestion
}) => {
  const [question, setQuestion] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const wasSetFromHistory = useRef(false);
  
  const [dropdownValues, setDropdownValues] = useState({
    menu1: '',
    menu2: '',
    menu3: '',
    menu4: ''
  });

  // Log component render
  console.log('🟡 QuestionSection rendered:', {
    isGenerating,
    initialQuestion,
    selectedHistoryQuestion,
    hasHistoryQuestion: !!selectedHistoryQuestion?.isFromHistory,
    wasSetFromHistory: wasSetFromHistory.current
  });

  // Track history question changes
  useEffect(() => {
    console.log('🟡 selectedHistoryQuestion changed:', selectedHistoryQuestion);
    if (selectedHistoryQuestion?.isFromHistory) {
      wasSetFromHistory.current = true;
    }
  }, [selectedHistoryQuestion]);

  // Handle initial question changes
  useEffect(() => {
    console.log('🟡 initialQuestion effect triggered:', {
      initialQuestion,
      wasSetFromHistory: wasSetFromHistory.current
    });
    
    if (initialQuestion) {
      setQuestion(initialQuestion);
      // Only submit if it's not from history
      if (!wasSetFromHistory.current) {
        handleQuestionSubmit(initialQuestion);
      }
    } else {
      wasSetFromHistory.current = false;
    }
  }, [initialQuestion]);

  // Handle loading state
  useEffect(() => {
    console.log('🟡 isGenerating changed:', {
      isGenerating,
      localLoading
    });
    if (!isGenerating && localLoading) {
      setLocalLoading(false);
    }
  }, [isGenerating, localLoading]);

  const handleQuestionSubmit = async (value) => {
    console.log('🟡 handleQuestionSubmit called:', {
      value,
      wasSetFromHistory: wasSetFromHistory.current,
      isHistoricalQuestion: selectedHistoryQuestion?.isFromHistory
    });

    if (!value.trim() || localLoading) {
      console.log('🟡 Submission blocked: empty value or loading');
      return;
    }

    // Skip if this is a historical question
    if (wasSetFromHistory.current) {
      console.log('🟡 Skipping submission for historical question');
      return;
    }

    setLocalLoading(true);
    try {
      console.log('🟡 Submitting question to parent');
      await onQuestionSubmit(value);
    } catch (error) {
      console.error('🟡 Error submitting question:', error);
      setLocalLoading(false);
    }
  };

  const handleClear = () => {
    console.log('🟡 Clearing question');
    setQuestion('');
    wasSetFromHistory.current = false;
    // Don't trigger a submission on clear
    if (selectedHistoryQuestion) {
      console.log('🟡 Resetting history state');
      onQuestionSubmit('');
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
    <div className={`p-4 transition-opacity duration-200 ${
      localLoading || isGenerating ? 'opacity-50' : 'opacity-100'
    }`}>
      <h2 className="text-xl font-bold mb-4">Questions Enter</h2>
      <QuestionInput
        value={question}
        onChange={(newValue) => setQuestion(newValue)}
        onSubmit={handleQuestionSubmit}
        loading={localLoading || isGenerating}
        onClear={handleClear}
        isHistoricalQuestion={selectedHistoryQuestion?.isFromHistory}
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