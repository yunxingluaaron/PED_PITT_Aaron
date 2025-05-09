import React, { useState, useEffect, useRef, useCallback } from 'react';
import QuestionInput from './QuestionInput';
import DropdownMenu from './DropdownMenu';

const QuestionSection = ({ 
  onQuestionSubmit, 
  isGenerating,
  initialQuestion,
  selectedHistoryQuestion,
  initialParentName = '',
  onNewConversation,
  className
}) => {
  const [question, setQuestion] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const wasSetFromHistory = useRef(false);
  const [parentName, setParentName] = useState(initialParentName);
  const [processingTime, setProcessingTime] = useState(null);
  const processingStartTime = useRef(null);
  
  const [dropdownValues, setDropdownValues] = useState({
    tone: 'balanced',
    detailLevel: 'moderate',
    empathy: 'moderate',
    professionalStyle: 'clinicallyBalanced'
  });

  useEffect(() => {
    console.log('🟡 QuestionSection mounted');
    return () => console.log('🟡 QuestionSection unmounted');
  }, []);

  useEffect(() => {
    if (isGenerating) {
      processingStartTime.current = Date.now();
      setProcessingTime(null);
    } else if (processingStartTime.current !== null && !isGenerating) {
      const endTime = Date.now();
      const timeTaken = endTime - processingStartTime.current;
      setProcessingTime(timeTaken);
      processingStartTime.current = null;
    }
  }, [isGenerating]);

  useEffect(() => {
    const handleConversationReset = () => {
      setProcessingTime(null);
      processingStartTime.current = null;
    };
    window.addEventListener('conversationReset', handleConversationReset);
    return () => window.removeEventListener('conversationReset', handleConversationReset);
  }, []);

  useEffect(() => {
    if (selectedHistoryQuestion?.isFromHistory && selectedHistoryQuestion.parent_name !== parentName) {
      setParentName(selectedHistoryQuestion.parent_name || '');
      wasSetFromHistory.current = true;
    }
  }, [selectedHistoryQuestion]);

  useEffect(() => {
    if (initialQuestion && initialQuestion !== question) {
      setQuestion(initialQuestion);
    } else if (!initialQuestion && question && wasSetFromHistory.current) {
      setQuestion('');
      wasSetFromHistory.current = false;
    }
  }, [initialQuestion, question]);

  useEffect(() => {
    if (initialParentName !== parentName) {
      setParentName(initialParentName);
    }
  }, [initialParentName]);

  useEffect(() => {
    if (!isGenerating && localLoading) {
      setLocalLoading(false);
    }
  }, [isGenerating, localLoading]);

  const handleQuestionSubmit = useCallback(async (value, conversationAction) => {
    if (!value?.trim() || localLoading) {
      console.error('❌ Question is empty or loading in handleQuestionSubmit');
      return;
    }
  
    setLocalLoading(true);
    processingStartTime.current = Date.now();
    setProcessingTime(null);
    
    try {
      const responseStyleParameters = {
        tone: dropdownValues.tone,
        detailLevel: dropdownValues.detailLevel,
        empathy: dropdownValues.empathy,
        professionalStyle: dropdownValues.professionalStyle
      };
      
      console.log('🔵 Calling onQuestionSubmit with:', { question: value, conversationAction, parentName, parameters: responseStyleParameters });
      await onQuestionSubmit(value, conversationAction, parentName, responseStyleParameters);
    } catch (error) {
      console.error('Error submitting question:', error);
      setLocalLoading(false);
      if (processingStartTime.current !== null) {
        const endTime = Date.now();
        const timeTaken = endTime - processingStartTime.current;
        setProcessingTime(timeTaken);
        processingStartTime.current = null;
      }
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
      onQuestionSubmit('', 'continue', parentName, responseStyleParameters, true);
    }
  }, [dropdownValues, onQuestionSubmit, parentName, selectedHistoryQuestion]);

  const handleNewConversation = useCallback(() => {
    setQuestion('');
    setParentName('');
    wasSetFromHistory.current = false;
    setProcessingTime(null);
    processingStartTime.current = null;
    onNewConversation();
  }, [onNewConversation]);

  const handleDropdownChange = useCallback((menu) => (e) => {
    setDropdownValues(prev => ({
      ...prev,
      [menu]: e.target.value
    }));
  }, []);

  const responseStyleMenus = [
    // ... (unchanged)
  ];

  const formatProcessingTime = (ms) => {
    if (ms === null) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

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

        {/* Processing time indicator */}
        {(isGenerating || processingTime !== null) && (
          <div className="mt-3 flex items-center">
            <div className="flex items-center">
              {isGenerating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  <span className="text-sm text-gray-600">Processing...</span>
                </>
              ) : processingTime !== null ? (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Processing time:</span> {formatProcessingTime(processingTime)}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
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