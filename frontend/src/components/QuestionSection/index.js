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
  const [isNewConversation, setIsNewConversation] = useState(true); // 新增状态

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
      setIsNewConversation(false); // 加载历史记录时设置为非新会话
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
    setIsNewConversation(true); // 设置为新会话
    onNewConversation();
  }, [onNewConversation]);

  const handleDropdownChange = useCallback((menu) => (e) => {
    setDropdownValues(prev => ({
      ...prev,
      [menu]: e.target.value
    }));
  }, []);

  const formatProcessingTime = (ms) => {
    if (ms === null) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const handleQuestionChange = useCallback((newValue) => {
    setQuestion(newValue);
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-sm pl-10 ${className}`}>
      <div className={`p-3 transition-all duration-200 ${
        localLoading || isGenerating ? 'opacity-50' : 'opacity-100'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Questions Entry</h2>
          <button
            onClick={handleNewConversation}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-sm"
            disabled={localLoading || isGenerating}
          >
            New Conversation
          </button>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <label htmlFor="parentName" className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[80px]">
            Parent Name
          </label>
          <input
            type="text"
            id="parentName"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            disabled={localLoading || isGenerating}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
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
          isNewConversation={isNewConversation}
        />

        {(isGenerating || processingTime !== null) && (
          <div className="mt-2 flex items-center">
            <div className="flex items-center">
              {isGenerating ? (
                <>
                  <div className="animate-spin mr-1 h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  <span className="text-xs text-gray-600">Processing...</span>
                </>
              ) : processingTime !== null ? (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Processing time:</span> {formatProcessingTime(processingTime)}
                </div>
              ) : null}
            </div>
          </div>
        )}

<div className="mt-4">
  <h1 className="text-2xl font-bold text-gray-900 mb-4">How VineAI Works</h1>

  {/* Section 1: Conversation Options */}
  <div className="bg-gray-50 rounded-lg p-4 mb-4">
    <h2 className="text-lg font-semibold text-gray-800 mb-2">
      When Pasting Patient Questions Into Above: Conversation Options Toggle:
    </h2>
    <ul className="space-y-3">
      <li>
        <h3 className="text-sm font-medium text-gray-800 flex items-center">
          <span className="mr-2 text-blue-500">•</span> Continue
        </h3>
        <p className="text-sm text-gray-600 ml-4">
          Uses real case analysis to address unclarified questions, ensuring a an empathetic, caring and professional conversation.
        </p>
      </li>
      <li>
        <h3 className="text-sm font-medium text-gray-800 flex items-center">
          <span className="mr-2 text-blue-500">•</span> Close
        </h3>
        <p className="text-sm text-gray-600 ml-4">
        Courteously ends the conversation to minimize your workload and streamlining your workflow.
        </p>
      </li>
    </ul>
  </div>

  {/* Divider */}
  <hr className="border-gray-200 my-4" />

  {/* Section 2: Answer Versions */}
  <div className="bg-gray-50 rounded-lg p-4">
    <h2 className="text-lg font-semibold text-gray-800 mb-2">
      When Selecting the Response Version From Dropdown:
    </h2>
    <ul className="space-y-3">
      <li>
        <h3 className="text-sm font-medium text-gray-800 flex items-center">
          <span className="mr-2 text-blue-500">•</span> Simplified Version
        </h3>
        <p className="text-sm text-gray-600 ml-4">
          Analyzes 60,000 doctor-parent dialogues to deliver concise, copy-paste-ready responses with the perfect tone.
        </p>
      </li>
      <li>
        <h3 className="text-sm font-medium text-gray-800 flex items-center">
          <span className="mr-2 text-blue-500">•</span> Detailed Version
        </h3>
        <p className="text-sm text-gray-600 ml-4">
          Provides comprehensive, hallucination-free medical information for quick reference and confident decision-making.
        </p>
      </li>
    </ul>
  </div>
</div>
      </div>
    </div>
  );
};

export default React.memo(QuestionSection);