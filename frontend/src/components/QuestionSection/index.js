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
  const [parentName, setParentName] = useState('');
  
  const [dropdownValues, setDropdownValues] = useState({
    // Response Style dropdowns
    tone: 'balanced',
    detailLevel: 'moderate',
    empathy: 'moderate',
    professionalStyle: 'clinicallyBalanced',
    // Parent Details dropdowns
    parentType: 'both',
    personality: 'balanced',
    ageRange: '30-35'
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
      // Only send original response style parameters to backend
      const responseStyleParameters = {
        tone: dropdownValues.tone,
        detailLevel: dropdownValues.detailLevel,
        empathy: dropdownValues.empathy,
        professionalStyle: dropdownValues.professionalStyle
      };
      
      await onQuestionSubmit({
        question: value,
        parameters: responseStyleParameters
      });
    } catch (error) {
      console.error('Error submitting question:', error);
      setLocalLoading(false);
    }
  };

  const handleClear = () => {
    console.log('🟡 Clearing question');
    setQuestion('');
    setParentName('');
    wasSetFromHistory.current = false;
    if (selectedHistoryQuestion) {
      console.log('🟡 Resetting history state');
      // Only send original response style parameters when clearing
      const responseStyleParameters = {
        tone: dropdownValues.tone,
        detailLevel: dropdownValues.detailLevel,
        empathy: dropdownValues.empathy,
        professionalStyle: dropdownValues.professionalStyle
      };
      
      onQuestionSubmit({ 
        question: '',
        parameters: responseStyleParameters,
        clearOnly: true
      });
    }
  };

  const handleDropdownChange = (menu) => (e) => {
    setDropdownValues(prev => ({
      ...prev,
      [menu]: e.target.value
    }));
  };

  const responseStyleMenus = [
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

  const parentDetailsMenus = [
    {
      id: 'parentType',
      label: 'Father/Mother',
      options: [
        { value: 'both', label: 'Both Parents' },
        { value: 'father', label: 'Father' },
        { value: 'mother', label: 'Mother' }
      ]
    },
    {
      id: 'personality',
      label: 'Personality',
      options: [
        { value: 'relaxed', label: 'Relaxed' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'anxious', label: 'Anxious' }
      ]
    },
    {
      id: 'ageRange',
      label: 'Age Range',
      options: [
        { value: '20-25', label: '20-25 years' },
        { value: '25-30', label: '25-30 years' },
        { value: '30-35', label: '30-35 years' },
        { value: '35-40', label: '35-40 years' },
        { value: '40+', label: '40+ years' }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {responseStyleMenus.map(menu => (
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

        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Parents Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Parent Name Input */}
            <div className="lg:col-span-4 flex items-center gap-4">
              <label htmlFor="parentName" className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                Parent Name
              </label>
              <input
                type="text"
                id="parentName"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                disabled={localLoading || isGenerating}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter parent's name"
              />
            </div>
            
            {/* Existing Dropdown Menus */}
            {parentDetailsMenus.map(menu => (
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
          
        {/* Help text */}
        <p className="mt-2 text-sm text-gray-500">
          Adjust these options to customize how the response is written and formatted.
        </p>
      </div>
    </div>
  );
};

export default QuestionSection;