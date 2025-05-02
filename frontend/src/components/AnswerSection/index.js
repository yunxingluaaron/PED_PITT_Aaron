import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from './components/Editor';
import ActionBar from './components/ActionBar';
import VersionControl from './components/VersionControl';
import VersionComparison from './components/VersionComparison';
import useVersionHistory from './hooks/useVersionHistory';
import useAnswerGeneration from './hooks/useAnswerGeneration';

export const AnswerSection = ({ 
  question,
  onAnswerGenerated, 
  onSourcesUpdate, 
  isGenerating,
  selectedHistoryQuestion,
  currentAnswer,
  parentName // Add parentName prop
}) => {
  const {
    loading,
    error,
    answer,
    sources,
    relationships,
    metadata,
    questionId,
    conversationId,
    generateAnswerFromQuestion,
    updateParentName // Use the new updateParentName function from hook
  } = useAnswerGeneration();

  const {
    versions,
    currentVersionId,
    setCurrentVersionId,
    addVersion,
    getCurrentVersion,
    toggleLike,
    toggleBookmark,
  } = useVersionHistory(questionId || selectedHistoryQuestion?.id);

  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [currentParentName, setCurrentParentName] = useState(parentName || ''); // Track parent name
  const processedQuestionRef = useRef('');

  const currentVersion = getCurrentVersion();
  const initialLoadDone = useRef(false);

  // Update currentParentName when parentName prop changes
  useEffect(() => {
    if (parentName !== undefined && parentName !== currentParentName) {
      console.log('🔄 Parent name updated from props:', parentName);
      setCurrentParentName(parentName);
      
      // Also update the parent name in the hook state
      if (updateParentName) {
        updateParentName(parentName);
      }
    }
  }, [parentName, currentParentName, updateParentName]);

  // Handle new question submissions
  useEffect(() => {
    const handleNewQuestion = async (event) => {
      const { question, parameters, parentName: eventParentName } = event.detail;
      console.log('🔄 Received new question event:', event.detail);
      
      // Update parent name from event if provided
      if (eventParentName !== undefined) {
        setCurrentParentName(eventParentName);
      }
      
      try {
        const result = await generateAnswerFromQuestion(question, { 
          parameters,
          parent_name: eventParentName || currentParentName // Pass parent name to API
        });
        if (result) {
          console.log('✅ Answer generated:', result);
          if (onAnswerGenerated) {
            // Include parent name in the result
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

  useEffect(() => {
    if (currentAnswer?.isHistoricalAnswer) {
      console.log('📜 Setting content from historical answer');
      setEditorContent(currentAnswer.detailed_response);
      setOriginalContent(currentAnswer.detailed_response);
      
      // Update parent name if available in the answer
      if (currentAnswer.parent_name) {
        setCurrentParentName(currentAnswer.parent_name);
        
        // Also update the parent name in the hook state
        if (updateParentName) {
          updateParentName(currentAnswer.parent_name);
        }
      }
      
      // Only add version if this is NOT the initial load of a historical answer
      if (!initialLoadDone.current && currentAnswer.isHistoricalAnswer) {
        initialLoadDone.current = true;
        // Don't add version on initial load
      } else if (!currentAnswer.isHistoricalAnswer && !versions.some(v => v.content === currentAnswer.detailed_response)) {
        addVersion(currentAnswer.detailed_response, 'ai', {
          parent_name: currentAnswer.parent_name || currentParentName
        });
      }
      
      if (onSourcesUpdate) {
        onSourcesUpdate(currentAnswer.sources || []);
      }
    } else if (answer) {
      console.log('🤖 Setting content from new AI answer');
      setEditorContent(answer);
      setOriginalContent(answer);
      if (!versions.length) {
        addVersion(answer, 'ai', {
          parent_name: currentParentName
        });
      }
    }
  }, [answer, currentAnswer, versions, addVersion, onSourcesUpdate, currentParentName, updateParentName]);

  useEffect(() => {
    const selectedVersion = getCurrentVersion();
    if (selectedVersion) {
      setEditorContent(selectedVersion.content);
      
      // If version has parent name metadata, update the current parent name
      if (selectedVersion.metadata?.parent_name) {
        setCurrentParentName(selectedVersion.metadata.parent_name);
        
        // Also update the parent name in the hook state
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

  // Handle question processing
  useEffect(() => {
    const handleAnswer = async () => {
      if (question && 
          typeof question === 'object' &&  
          question.question !== processedQuestionRef.current &&
          !currentAnswer?.isHistoricalAnswer) {
        
        console.log('🔄 Processing new question:', question);
        processedQuestionRef.current = question.question;
        
        try {
          const options = selectedHistoryQuestion?.isFromHistory ? {
            isHistoricalAnswer: true,
            conversation_id: selectedHistoryQuestion.conversation_id,
            response: selectedHistoryQuestion.response,
            source_data: selectedHistoryQuestion.source_data,
            response_metadata: selectedHistoryQuestion.response_metadata,
            question_id: selectedHistoryQuestion.id,
            parameters: question.parameters,
            parent_name: question.parentName || currentParentName // Include parent name in historical options
          } : { 
            parameters: question.parameters,
            parent_name: question.parentName || currentParentName, // Include parent name in normal options
            conversation_id: conversationId
          };

          const response = await generateAnswerFromQuestion(question.question, options);
          
          if (response && response.detailed_response) {
            setEditorContent(response.detailed_response);
            setOriginalContent(response.detailed_response);
            
            if (onAnswerGenerated) {
              onAnswerGenerated({
                id: response.question_id,
                answer: response.detailed_response,
                sources: response.sources || [],
                relationships: response.relationships || [],
                metadata: response.metadata || {},
                isHistoricalAnswer: options.isHistoricalAnswer,
                parameters: question.parameters,
                parent_name: response.parent_name || currentParentName // Include parent name in response
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
  }, [question, generateAnswerFromQuestion, onAnswerGenerated, currentAnswer, selectedHistoryQuestion, currentParentName, conversationId]);

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
        // Check if this exact content already exists in versions
        if (!versions.some(v => v.content === editorContent.trim())) {
          // Include parent name in version metadata
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

  // In your AnswerSection component
  const handleCopy = (content) => {
    // Save a new version when copying
    addVersion(content, 'copy', {
      type: 'copy',
      timestamp: new Date().toISOString(),
      parent_name: currentParentName // Include parent name in copied version
    });
  };

  const getPlainTextContent = useCallback((htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, []);

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div id="answer-section" className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <h2 className="text-xl font-bold mb-4">VineAI Response</h2>
          
          {/* Display parent name if available */}
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
          parentName={currentParentName} // Pass parent name to ActionBar if needed
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