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
  currentAnswer 
}) => {
  const {
    loading,
    error,
    answer,
    sources,
    relationships,
    metadata,
    questionId,
    generateAnswerFromQuestion
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
  const processedQuestionRef = useRef('');

  const currentVersion = getCurrentVersion();
  const initialLoadDone = useRef(false);

  // Handle new question submissions
  useEffect(() => {
    const handleNewQuestion = async (event) => {
      const { question, parameters } = event.detail;
      console.log('🔄 Received new question event:', event.detail);
      
      try {
        const result = await generateAnswerFromQuestion(question, { parameters });
        if (result) {
          console.log('✅ Answer generated:', result);
          if (onAnswerGenerated) {
            onAnswerGenerated(result);
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
  }, [generateAnswerFromQuestion, onAnswerGenerated]);

  useEffect(() => {
    if (currentAnswer?.isHistoricalAnswer) {
      console.log('📜 Setting content from historical answer');
      setEditorContent(currentAnswer.detailed_response);
      setOriginalContent(currentAnswer.detailed_response);
      
      // Only add version if this is NOT the initial load of a historical answer
      if (!initialLoadDone.current && currentAnswer.isHistoricalAnswer) {
        initialLoadDone.current = true;
        // Don't add version on initial load
      } else if (!currentAnswer.isHistoricalAnswer && !versions.some(v => v.content === currentAnswer.detailed_response)) {
        addVersion(currentAnswer.detailed_response, 'ai');
      }
      
      if (onSourcesUpdate) {
        onSourcesUpdate(currentAnswer.sources || []);
      }
    } else if (answer) {
      console.log('🤖 Setting content from new AI answer');
      setEditorContent(answer);
      setOriginalContent(answer);
      if (!versions.length) {
        addVersion(answer, 'ai');
      }
    }
  }, [answer, currentAnswer]);

  useEffect(() => {
    const selectedVersion = getCurrentVersion();
    if (selectedVersion) {
      setEditorContent(selectedVersion.content);
    }
  }, [currentVersionId, getCurrentVersion]);

  useEffect(() => {
    if (sources && onSourcesUpdate && !currentAnswer?.isHistoricalAnswer) {
      onSourcesUpdate(sources);
    }
  }, [sources, onSourcesUpdate, currentAnswer]);

  // Handle question processing
  useEffect(() => {
    const handleAnswer = async () => {
      if (question && 
          typeof question === 'object' &&  // Change to handle object with parameters
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
            parameters: question.parameters
          } : { parameters: question.parameters };

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
                parameters: question.parameters
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
  }, [question, generateAnswerFromQuestion, onAnswerGenerated, currentAnswer, selectedHistoryQuestion]);

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
          addVersion(editorContent, 'user');
          console.log('Version saved successfully');
        } else {
          console.log('Version with this content already exists');
        }
      } catch (error) {
        console.error('Failed to save version:', error);
      }
    }
  }, [editorContent, addVersion, questionId, selectedHistoryQuestion, versions]);

    // In your AnswerSection component
  const handleCopy = (content) => {
    // Save a new version when copying
    addVersion(content, 'copy', {
      type: 'copy',
      timestamp: new Date().toISOString()
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
          <h2 className="text-xl font-bold mb-4">AI Generated Response</h2>
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
        />
        {showComparison && (
          <VersionComparison
            originalText={versions[0]?.content || ''}
            modifiedText={editorContent}
          />
        )}
      </div>
      <VersionControl
        versions={versions}
        currentVersion={currentVersionId}
        onVersionSelect={setCurrentVersionId}
      />
    </div>
  );
};

export default AnswerSection;