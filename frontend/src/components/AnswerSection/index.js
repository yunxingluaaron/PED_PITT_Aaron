// frontend\src\components\AnswerSection\index.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from './components/Editor';
import ActionBar from './components/ActionBar';
import VersionControl from './components/VersionControl';
import VersionComparison from './components/VersionComparison';
import useVersionHistory from './hooks/useVersionHistory';
import useAnswerGeneration from './hooks/useAnswerGeneration';
import SourcesDisplay from './components/SourcesDisplay';

export const AnswerSection = ({ question, onAnswerGenerated, onSourcesUpdate }) => {
  const {
    loading,
    error,
    answer,
    sources,
    relationships,
    metadata,
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
  } = useVersionHistory('');

  const [editorContent, setEditorContent] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const processedQuestionRef = useRef('');

  // Handle answer updates
  useEffect(() => {
    if (answer) {
      console.log('Setting editor content:', answer); // Debug log
      setEditorContent(answer);
      if (!versions.some(v => v.content === answer)) {
        addVersion(answer);
      }
    }
  }, [answer]);

  useEffect(() => {
    if (sources && onSourcesUpdate) {
      onSourcesUpdate(sources);
    }
  }, [sources, onSourcesUpdate]);

  // Handle question processing
  useEffect(() => {
    const handleAnswer = async () => {
      if (question && 
          typeof question === 'string' && 
          question !== processedQuestionRef.current) {
        processedQuestionRef.current = question;
        try {
          const response = await generateAnswerFromQuestion(question);
          console.log('Response received:', response); // Debug log
          
          if (response && response.detailed_response) {
            // Update editor content directly with the detailed response
            setEditorContent(response.detailed_response);
            
            if (onAnswerGenerated) {
              onAnswerGenerated({
                answer: response.detailed_response,
                sources: response.sources || [],
                relationships: response.relationships || [],
                metadata: response.metadata || {}
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
  }, [question]);

  // Memoize getCurrentVersion result
  const currentVersion = getCurrentVersion();

  // Memoize handleSave to prevent unnecessary rerenders
  const handleSave = useCallback(() => {
    if (editorContent && !versions.some(v => v.content === editorContent)) {
      addVersion(editorContent);
    }
  }, [editorContent, versions, addVersion]);

  const getPlainTextContent = useCallback((htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, []);

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4">
          <h2 className="text-xl font-bold mb-4">AI Generated Response</h2>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : (
            <Editor
              value={editorContent || ''} 
              onChange={setEditorContent}
            />
          )}
        </div>
        <ActionBar
          onSave={handleSave}
          onLike={() => toggleLike(currentVersionId)}
          onBookmark={() => toggleBookmark(currentVersionId)}
          isLiked={currentVersion?.isLiked}
          isBookmarked={currentVersion?.isBookmarked}
          textToCopy={getPlainTextContent(editorContent)}
          metadata={metadata}
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