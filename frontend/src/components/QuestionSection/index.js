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
  
// Make sure your dropdownValues state matches these IDs
const [dropdownValues, setDropdownValues] = useState({
  tone: 'balanced',           // Default to balanced tone
  detailLevel: 'moderate',    // Default to moderate detail
  empathy: 'moderate',        // Default to moderate empathy
  professionalStyle: 'clinicallyBalanced'  // Default to clinically balanced style
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
    if (!value.trim() || localLoading) {
      return;
    }
  
    setLocalLoading(true);
    try {
      await onQuestionSubmit({
        question: value,
        parameters: dropdownValues
      });
    } catch (error) {
      console.error('Error submitting question:', error);
      setLocalLoading(false);
    }
  };

  const handleClear = () => {
    console.log('🟡 Clearing question');
    setQuestion('');
    wasSetFromHistory.current = false;
    // Instead of submitting empty string, just reset the history state
    if (selectedHistoryQuestion) {
      console.log('🟡 Resetting history state');
      // Reset any history-related state without triggering submission
      onQuestionSubmit({ 
        question: '',
        parameters: dropdownValues,
        clearOnly: true // Add this flag
      });
    }
  };

  const handleDropdownChange = (menu) => (e) => {
    setDropdownValues(prev => ({
      ...prev,
      [menu]: e.target.value
    }));
  };

  const dropdownMenus = [
    {
      id: 'tone',
      label: 'Tone',
      options: [
        { value: 'friendly', label: 'Friendly' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'formal', label: 'Formal' }
      ]
    },
    {
      id: 'detailLevel',
      label: 'Level of Detail',
      options: [
        { value: 'brief', label: 'Brief' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'comprehensive', label: 'Comprehensive' }
      ]
    },
    {
      id: 'empathy',
      label: 'Empathy',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'high', label: 'High' }
      ]
    },
    {
      id: 'professionalStyle',
      label: 'Professional Style',
      options: [
        { value: 'laypersonFriendly', label: 'Layperson-Friendly' },
        { value: 'clinicallyBalanced', label: 'Clinically Balanced' },
        { value: 'technical', label: 'Technical' }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className={`p-4 transition-all duration-200 ${
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

        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Customize Response Style
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          
          {/* Optional: Help text */}
          <p className="mt-2 text-sm text-gray-500">
            Adjust these options to customize how the response is written and formatted.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuestionSection;