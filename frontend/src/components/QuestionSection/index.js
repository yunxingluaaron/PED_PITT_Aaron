import React, { useState, useEffect, useRef, useCallback } from 'react';
import QuestionInput from './QuestionInput';
import DropdownMenu from './DropdownMenu';

const QuestionSection = ({ 
  onQuestionSubmit, 
  isGenerating,
  initialQuestion,
  selectedHistoryQuestion,
  initialParentName = '',
  onNewConversation, // New prop for handling new conversation
  className
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

  // Log only once on mount for debugging
  useEffect(() => {
    console.log('🟡 QuestionSection mounted');
    return () => console.log('🟡 QuestionSection unmounted');
  }, []);

  // Handle selectedHistoryQuestion changes
  useEffect(() => {
    if (selectedHistoryQuestion?.isFromHistory && selectedHistoryQuestion.parent_name !== parentName) {
      setParentName(selectedHistoryQuestion.parent_name || '');
      wasSetFromHistory.current = true;
    }
  }, [selectedHistoryQuestion]);

  // Handle initialQuestion changes - fixed the potential endless loop
  useEffect(() => {
    if (initialQuestion && initialQuestion !== question) {
      setQuestion(initialQuestion);
      if (!wasSetFromHistory.current) {
        // Only submit automatically if it wasn't from history
        // This prevents potential infinite loops
        // We're not calling handleQuestionSubmit here anymore
      }
    } else if (!initialQuestion && question && wasSetFromHistory.current) {
      setQuestion('');
      wasSetFromHistory.current = false;
    }
  }, [initialQuestion]);

  // Handle initialParentName changes
  useEffect(() => {
    if (initialParentName !== parentName) {
      setParentName(initialParentName);
    }
  }, [initialParentName]);

  // Sync localLoading with isGenerating
  useEffect(() => {
    if (!isGenerating && localLoading) {
      setLocalLoading(false);
    }
  }, [isGenerating, localLoading]);

  // Use useCallback to prevent recreation of this function on each render
  const handleQuestionSubmit = useCallback(async (value) => {
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
  }, [dropdownValues, localLoading, onQuestionSubmit, parentName]);

  const handleClear = useCallback(() => {
    setQuestion('');
    wasSetFromHistory.current = false;
    if (selectedHistoryQuestion) {
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
  }, [dropdownValues, onQuestionSubmit, parentName, selectedHistoryQuestion]);

  // Handler for the new conversation button
  const handleNewConversation = useCallback(() => {
    // Clear the local state
    setQuestion('');
    setParentName('');
    wasSetFromHistory.current = false;
    
    // Call the parent's handler
    onNewConversation();
  }, [onNewConversation]);

  const handleDropdownChange = useCallback((menu) => (e) => {
    setDropdownValues(prev => ({
      ...prev,
      [menu]: e.target.value
    }));
  }, []);

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

  // Memoize the onChange handler to avoid recreating it on every render
  const handleQuestionChange = useCallback((newValue) => {
    setQuestion(newValue);
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-sm pl-16 ${className}`}>
      <div className={`p-4 transition-all duration-200 ${
        localLoading || isGenerating ? 'opacity-50' : 'opacity-100'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Questions Enter</h2>
          <button
            onClick={handleNewConversation}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
            disabled={localLoading || isGenerating}
          >
            New Conversation
          </button>
        </div>
        
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
          onChange={handleQuestionChange}
          onSubmit={handleQuestionSubmit}
          loading={localLoading || isGenerating}
          onClear={handleClear}
          isHistoricalQuestion={selectedHistoryQuestion?.isFromHistory}
        />

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

export default React.memo(QuestionSection);