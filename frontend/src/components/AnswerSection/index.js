// frontend\src\components\AnswerSection\index.js

import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import ActionBar from './components/ActionBar';
import VersionControl from './components/VersionControl';
import VersionComparison from './components/VersionComparison';
import useVersionHistory from './hooks/useVersionHistory';
import useAnswerGeneration from './hooks/useAnswerGeneration';
import SourcesDisplay from './components/SourcesDisplay';

export const AnswerSection = ({ question }) => {
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
  } = useVersionHistory(answer || '');

  const [editorContent, setEditorContent] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (answer) {
      setEditorContent(answer);
      addVersion(answer);
    }
  }, [answer, addVersion]);

  useEffect(() => {
    if (question) {
      generateAnswerFromQuestion(question);
    }
  }, [question, generateAnswerFromQuestion]);

  const handleSave = () => {
    addVersion(editorContent);
  };

  const currentVersion = getCurrentVersion();

  const getPlainTextContent = (htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

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
            <>
              <Editor
                value={editorContent}
                onChange={setEditorContent}
              />
              {sources && sources.length > 0 && (
                <SourcesDisplay sources={sources} />
              )}
            </>
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
            originalText={versions[0].content}
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