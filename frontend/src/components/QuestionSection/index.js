import React, { useState, useEffect, useRef } from 'react';
import QuestionInput from './QuestionInput';
import DropdownMenu from './DropdownMenu';

const QuestionSection = ({ 
  onQuestionSubmit, 
  isGenerating,
  initialQuestion,
  selectedHistoryQuestion,
  initialParentName = '',
  className // Add className prop to receive styles from parent
}) => {
  const [question, setQuestion] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const wasSetFromHistory = useRef(false);
  const [parentName, setParentName] = useState(initialParentName);
  
  const [dropdownValues, setDropdownValues] = useState({
    tone: 'balanced',
    detailLevel: 'moderate',
    empathy: 'moderate',
    professionalStyle: 'clinicallyBalanced'
  });

  console.log('🟡 QuestionSection rendered:', {
    isGenerating,
    initialQuestion,
    selectedHistoryQuestion,
    hasHistoryQuestion: !!selectedHistoryQuestion?.isFromHistory,
    wasSetFromHistory: wasSetFromHistory.current,
    initialParentName
  });

  useEffect(() => {
    console.log('🟡 selectedHistoryQuestion changed:', selectedHistoryQuestion);
    if (selectedHistoryQuestion?.isFromHistory) {
      wasSetFromHistory.current = true;
      if (selectedHistoryQuestion.parent_name) {
        setParentName(selectedHistoryQuestion.parent_name);
      }
    }
  }, [selectedHistoryQuestion]);

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

  useEffect(() => {
    console.log('🟡 initialParentName changed:', initialParentName);
    if (initialParentName !== parentName) {
      setParentName(initialParentName);
    }
  }, [initialParentName]);

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
      const responseStyleParameters = {
        tone: dropdownValues.tone,
        detailLevel: dropdownValues.detailLevel,
        empathy: dropdownValues.empathy,
        professionalStyle: dropdownValues.professionalStyle
      };
      
      await onQuestionSubmit({
        question: value,
        parameters: responseStyleParameters,
        parentName: parentName
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
    if (selectedHistoryQuestion) {
      console.log('🟡 Resetting history state');
      const responseStyleParameters = {
        tone: dropdownValues.tone,
        detailLevel: dropdownValues.detailLevel,
        empathy: dropdownValues.empathy,
        professionalStyle: dropdownValues.professionalStyle
      };
      
      onQuestionSubmit({ 
        question: '',
        parameters: responseStyleParameters,
        clearOnly: true,
        parentName: parentName
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

  return (
    <div className={`bg-white rounded-lg shadow-sm pl-16 ${className}`}>
      <div className={`p-4 transition-all duration-200 ${
        localLoading || isGenerating ? 'opacity-50' : 'opacity-100'
      }`}>
        <h2 className="text-xl font-bold mb-4">Questions Enter</h2>
        
        <div className="mb-4 flex items-center gap-4">
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
        
        <QuestionInput
          value={question}
          onChange={(newValue) => setQuestion(newValue)}
          onSubmit={handleQuestionSubmit}
          loading={localLoading || isGenerating}
          onClear={handleClear}
          isHistoricalQuestion={selectedHistoryQuestion?.isFromHistory}
        />

        {/* <div className="mt-6">
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
        </div> */}
          
        <p className="mt-2 text-sm text-gray-500">
          Adjust these options to customize how the response is written and formatted.
        </p>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Placeholder Section 1</h1>
          <p className="text-sm text-gray-600 mb-4">
            Placeholder description for Section 1. This will be replaced with actual content.
          </p>
          
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Placeholder Subsection 1.1</h2>
          <p className="text-sm text-gray-600 mb-4">
            Placeholder description for Subsection 1.1. This will be replaced with actual content.
          </p>
          
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Placeholder Subsection 1.2</h2>
          <p className="text-sm text-gray-600 mb-4">
            Placeholder description for Subsection 1.2. This will be replaced with actual content.
          </p>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">Placeholder Section 2</h1>
          <p className="text-sm text-gray-600 mb-4">
            Placeholder description for Section 2. This will be replaced with actual content.
          </p>
          
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Placeholder Subsection 2.1</h2>
          <p className="text-sm text-gray-600 mb-4">
            Placeholder description for Subsection 2.1. This will be replaced with actual content.
          </p>
          
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Placeholder Subsection 2.2</h2>
          <p className="text-sm text-gray-600 mb-4">
            Placeholder description for Subsection 2.2. This will be replaced with actual content.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuestionSection;