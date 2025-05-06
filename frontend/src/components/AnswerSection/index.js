// src\components\AnswerSection\index.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from './components/Editor';
import ActionBar from './components/ActionBar';
import VersionControl from './components/VersionControl';
import VersionComparison from './components/VersionComparison';
import useVersionHistory from './hooks/useVersionHistory';
import useAnswerGeneration from './hooks/useAnswerGeneration';
import DropdownMenu from '../QuestionSection/DropdownMenu';

export const AnswerSection = ({ 
  question,
  onAnswerGenerated, 
  onSourcesUpdate, 
  isGenerating,
  selectedHistoryQuestion,
  currentAnswer,
  parentName
}) => {

  const {
    loading,
    error,
    answer,
    detailedResponse,
    simpleResponse,
    sources,
    relationships,
    metadata,
    questionId,
    conversationId,
    generateAnswerFromQuestion,
    updateParentName,
    clearAnswer
  } = useAnswerGeneration();

  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [currentParentName, setCurrentParentName] = useState(parentName || '');
  const [responseMode, setResponseMode] = useState('simplified');
  const [isNewConversation, setIsNewConversation] = useState(!question && !currentAnswer);
  const processedQuestionRef = useRef('');
  const initialLoadDone = useRef(false);

  const versionHistoryArg = isNewConversation ? null : (questionId || selectedHistoryQuestion?.id);


    
  const {
    versions,
    currentVersionId,
    setCurrentVersionId,
    addVersion,
    getCurrentVersion,
    toggleLike,
    toggleBookmark,
    reset: resetVersionHistory
  } = useVersionHistory(isNewConversation ? null : (questionId || selectedHistoryQuestion?.id));

  const currentVersion = getCurrentVersion();
  const [processingStartTime, setProcessingStartTime] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);



    // Add this useEffect to track the processing time
  useEffect(() => {
    // Start timing when question is submitted but answer isn't ready yet
    if (isGenerating && !loading && processingStartTime === null) {
      console.log('🕒 Starting processing time tracking');
      setProcessingStartTime(Date.now());
      setProcessingTime(null);
    }
    
    // End timing when answer is generated
    if (!isGenerating && processingStartTime !== null) {
      const endTime = Date.now();
      const timeTaken = endTime - processingStartTime;
      console.log(`🕒 Processing completed in ${timeTaken}ms`);
      setProcessingTime(timeTaken);
      setProcessingStartTime(null);
    }
  }, [isGenerating, loading]);

  // Add this to reset the timer on conversation reset
  useEffect(() => {
    const handleResetConversation = () => {
      setProcessingTime(null);
      setProcessingStartTime(null);
    };

    const answerSectionElement = document.getElementById('answer-section');
    if (answerSectionElement) {
      answerSectionElement.addEventListener('resetConversation', handleResetConversation);
    }
    
    window.addEventListener('globalResetConversation', handleResetConversation);

    return () => {
      if (answerSectionElement) {
        answerSectionElement.removeEventListener('resetConversation', handleResetConversation);
      }
      window.removeEventListener('globalResetConversation', handleResetConversation);
    };
  }, []);

  const formatProcessingTime = (ms) => {
    if (ms === null) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Listen for reset conversation event

  useEffect(() => {
    const handleResetConversation = (event) => {
      console.log('🔴 AnswerSection - Conversation reset received', event);
      setEditorContent('');
      setOriginalContent('');
      setIsNewConversation(true);
      setCurrentParentName('');
      setResponseMode('simplified');
      clearAnswer(); // 清空 useAnswerGeneration 的状态
      setCurrentVersionId(null); // 重置版本选择
      resetVersionHistory(); // 应调用 useVersionHistory 的 reset
      console.log('🔴 AnswerSection - Conversation reset complete');
    };

    const answerSectionElement = document.getElementById('answer-section');
    if (answerSectionElement) {
      console.log('🔴 AnswerSection - Adding resetConversation event listener');
      answerSectionElement.addEventListener('resetConversation', handleResetConversation);
    } else {
      console.warn('🔴 AnswerSection - Could not find answer-section element');
    }

    return () => {
      if (answerSectionElement) {
        console.log('🔴 AnswerSection - Removing resetConversation event listener');
        answerSectionElement.removeEventListener('resetConversation', handleResetConversation);
      }
    };
  }, [clearAnswer, resetVersionHistory]);
  
  // Add this debugging code right in the render function, near the top
  // (For debugging purposes, remove in production)
  console.log('🔴 AnswerSection rendering with isNewConversation:', isNewConversation);

  useEffect(() => {
    if (parentName !== undefined && parentName !== currentParentName) {
      console.log('🔄 Parent name updated from props:', parentName);
      setCurrentParentName(parentName);
      if (updateParentName) {
        updateParentName(parentName);
      }
    }
  }, [parentName, currentParentName, updateParentName]);

  useEffect(() => {
    const handleNewQuestion = async (event) => {
      const { question, parameters, parentName: eventParentName } = event.detail;
      console.log('🔄 Received new question event:', event.detail);
      
      // Set to false since we're now getting a question
      setIsNewConversation(false);
      
      if (eventParentName !== undefined) {
        setCurrentParentName(eventParentName);
      }
      
      try {
        const result = await generateAnswerFromQuestion(question, { 
          parameters,
          parent_name: eventParentName || currentParentName
        });
        if (result) {
          console.log('✅ Answer generated:', result);
          if (onAnswerGenerated) {
            onAnswerGenerated({
              ...result,
              parent_name: eventParentName || currentParentName || result.parent_name
            });
          }
        }
      } catch (error) {
        console.error('❌ Error generating answer:', error);
      }
    };
  
    const element = document.getElementById('answer-section');
    if (element) {
      element.addEventListener('newQuestion', handleNewQuestion);
      return () => {
        element.removeEventListener('newQuestion', handleNewQuestion);
      };
    }
  }, [generateAnswerFromQuestion, onAnswerGenerated, currentParentName]);

// AnswerSection.js
  useEffect(() => {
    console.log('🔄 Response mode changed to:', responseMode);
    console.log('📜 Current answer:', currentAnswer);
    console.log('🤖 New answer data:', { answer, detailedResponse, simpleResponse });

    let content = '';
    if (currentAnswer?.isHistoricalAnswer) {
      console.log('📜 Processing historical answer');
      content = responseMode === 'detailed'
        ? (currentAnswer.detailed_response || 'Detailed response not available')
        : (currentAnswer.simple_response || currentAnswer.response || 'Simplified response not available');
      setIsNewConversation(false);
    } else if (currentAnswer && !isGenerating) {
      console.log('🤖 Processing new answer from currentAnswer');
      content = responseMode === 'detailed'
        ? (currentAnswer.detailed_response || 'Detailed response not available')
        : (currentAnswer.simple_response || currentAnswer.response || 'Simplified response not available');
      setIsNewConversation(false);
    } else if (answer && !isGenerating) {
      console.log('🤖 Processing new AI answer from useAnswerGeneration');
      content = responseMode === 'detailed'
        ? (detailedResponse || 'Detailed response not available')
        : (simpleResponse || detailedResponse || 'Simplified response not available');
      setIsNewConversation(false);
    } else if (isNewConversation || (!currentAnswer && !answer)) {
      content = '';
      setIsNewConversation(true);
    } else {
      content = 'No response available';
    }

    console.log('📝 Setting editor content to:', content);
    setEditorContent(content);
    setOriginalContent(content);

    if (currentAnswer?.isHistoricalAnswer) {
      if (currentAnswer.parent_name) {
        setCurrentParentName(currentAnswer.parent_name);
        if (updateParentName) {
          updateParentName(currentAnswer.parent_name);
        }
      }
      if (!initialLoadDone.current && currentAnswer.isHistoricalAnswer) {
        initialLoadDone.current = true;
      } else if (!currentAnswer.isHistoricalAnswer && content && !versions.some(v => v.content === content)) {
        addVersion(content, 'ai', {
          parent_name: currentAnswer?.parent_name || currentParentName
        });
      }
      if (onSourcesUpdate) {
        onSourcesUpdate(currentAnswer.sources || []);
      }
    } else if (answer && !versions.length) {
      addVersion(content, 'ai', {
        parent_name: currentParentName
      });
    }
  }, [answer, detailedResponse, simpleResponse, responseMode, currentAnswer, versions, addVersion, onSourcesUpdate, currentParentName, updateParentName, isNewConversation, isGenerating]);

  useEffect(() => {
    const selectedVersion = getCurrentVersion();
    if (selectedVersion) {
      setEditorContent(selectedVersion.content);
      if (selectedVersion.metadata?.parent_name) {
        setCurrentParentName(selectedVersion.metadata.parent_name);
        if (updateParentName) {
          updateParentName(selectedVersion.metadata.parent_name);
        }
      }
    }
  }, [currentVersionId, getCurrentVersion, updateParentName]);

  useEffect(() => {
    if (sources && onSourcesUpdate && !currentAnswer?.isHistoricalAnswer) {
      onSourcesUpdate(sources);
    }
  }, [sources, onSourcesUpdate, currentAnswer]);

  useEffect(() => {
    const handleAnswer = async () => {
      if (question && 
          typeof question === 'object' &&  
          question.question !== processedQuestionRef.current &&
          !currentAnswer?.isHistoricalAnswer) {
        
        console.log('🔄 Processing new question:', question);
        processedQuestionRef.current = question.question;
        
        // We're processing a question, so we're not in a new conversation
        setIsNewConversation(false);
        
        try {
          const options = selectedHistoryQuestion?.isFromHistory ? {
            isHistoricalAnswer: true,
            conversation_id: selectedHistoryQuestion.conversation_id,
            response: selectedHistoryQuestion.response,
            simple_response: selectedHistoryQuestion.simple_response || selectedHistoryQuestion.response || 'Simplified response not available',
            detailed_response: selectedHistoryQuestion.detailed_response || 'Detailed response not available',
            source_data: selectedHistoryQuestion.source_data || [],
            response_metadata: selectedHistoryQuestion.response_metadata || {},
            question_id: selectedHistoryQuestion.id,
            parameters: question.parameters,
            parent_name: question.parentName || currentParentName
          } : { 
            parameters: question.parameters,
            parent_name: question.parentName || currentParentName,
            conversation_id: conversationId
          };

          const response = await generateAnswerFromQuestion(question.question, options);
          console.log('🔍 Response from generateAnswerFromQuestion:', response);
          
          if (response && (response.detailed_response || response.simple_response)) {
            const content = responseMode === 'detailed' 
              ? (response.detailed_response || 'Detailed response not available')
              : (response.simple_response || response.response || 'Simplified response not available');
            setEditorContent(content);
            setOriginalContent(content);
            
            if (onAnswerGenerated) {
              onAnswerGenerated({
                id: response.question_id,
                answer: content,
                detailed_response: response.detailed_response || 'Detailed response not available',
                simple_response: response.simple_response || response.response || 'Simplified response not available',
                sources: response.sources || [],
                relationships: response.relationships || [],
                metadata: response.metadata || {},
                isHistoricalAnswer: options.isHistoricalAnswer,
                parameters: question.parameters,
                parent_name: response.parent_name || currentParentName
              });
            }
          }
        } catch (error) {
          console.error('Failed to generate answer:', error);
          setEditorContent('Error generating response: ' + error.message);
        }
      }
    };

    handleAnswer();
  }, [question, generateAnswerFromQuestion, onAnswerGenerated, currentAnswer, selectedHistoryQuestion, currentParentName, conversationId, responseMode]);

  const handleReset = useCallback(() => {
    setEditorContent(originalContent);
  }, [originalContent]);

  const handleClear = useCallback(() => {
    setEditorContent('');
  }, []);

  const handleSave = useCallback(() => {
    console.log('Saving version, content:', editorContent?.trim());
    if (editorContent && editorContent.trim()) {
      try {
        const currentQuestionId = questionId || selectedHistoryQuestion?.id;
        if (!currentQuestionId) {
          console.warn('No question ID available for saving version');
          return;
        }
        if (!versions.some(v => v.content === editorContent.trim())) {
          addVersion(editorContent, 'user', {
            parent_name: currentParentName,
            timestamp: new Date().toISOString()
          });
          console.log('Version saved successfully');
        } else {
          console.log('Version with this content already exists');
        }
      } catch (error) {
        console.error('Failed to save version:', error);
      }
    }
  }, [editorContent, addVersion, questionId, selectedHistoryQuestion, versions, currentParentName]);

  const handleCopy = (content) => {
    addVersion(content, 'copy', {
      type: 'copy',
      timestamp: new Date().toISOString(),
      parent_name: currentParentName
    });
  };

  const getPlainTextContent = useCallback((htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, []);

  // Render a welcome message for new conversations
  const renderWelcomeMessage = () => {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8 max-w-md bg-blue-50 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            Welcome to a New Conversation
          </h3>
          <p className="text-gray-700 mb-4">
            Please enter your question in the input area to get a response from the AI.
          </p>
          <div className="text-gray-600 text-sm">
            <p className="mb-2">Tips:</p>
            <ul className="text-left list-disc pl-5 space-y-1">
              <li>Be specific with your questions for more accurate answers</li>
              <li>You can provide context by mentioning relevant details</li>
              <li>Enter a parent name if needed for family-related questions</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div id="answer-section" className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="flex flex-col mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">VineAI Response</h2>
              <DropdownMenu
                options={[
                  { value: 'detailed', label: 'Detailed' },
                  { value: 'simplified', label: 'Simplified' },
                ]}
                value={responseMode}
                onChange={(value) => setResponseMode(value)}
              />
            </div>
            
            {/* Processing time indicator */}
            {(processingTime !== null || isGenerating) && (
              <div className="mt-1 flex items-center">
                {isGenerating ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-xs text-gray-600">Processing question...</span>
                  </div>
                ) : processingTime !== null ? (
                  <div className="text-xs text-gray-500">
                    Response generated in {formatProcessingTime(processingTime)}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          
          {currentParentName && (
            <div className="mb-3 text-sm text-gray-600">
              <span className="font-medium">Parent:</span> {currentParentName}
            </div>
          )}
          
          <div className="flex-1 overflow-hidden">
            {loading || isGenerating ? (
              <div className="animate-pulse h-full bg-white rounded-lg border p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : isNewConversation ? (
              renderWelcomeMessage()
            ) : (
              <Editor
                value={editorContent}
                onChange={setEditorContent}
                onReset={handleReset}
                onClear={handleClear}
              />
            )}
          </div>
        </div>
        <ActionBar
          onSave={handleSave}
          onLike={() => toggleLike(currentVersionId)}
          onBookmark={() => toggleBookmark(currentVersionId)}
          isLiked={currentVersion?.isLiked}
          isBookmarked={currentVersion?.isBookmarked}
          textToCopy={getPlainTextContent(editorContent)}
          metadata={metadata}
          onCopy={handleCopy}
          parentName={currentParentName}
          disabled={isNewConversation} // Disable action bar for new conversations
        />
        {showComparison && (
          <VersionComparison
            originalText={versions[0]?.content || ''}
            modifiedText={editorContent}
          />
        )}
      </div>
      {/* <VersionControl
        versions={versions}
        currentVersion={currentVersionId}
        onVersionSelect={setCurrentVersionId}
      /> */}
    </div>
  );
};

export default AnswerSection;