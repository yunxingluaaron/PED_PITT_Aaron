// src/components/AnswerSection/index.js
import React, { useState } from 'react';
import Editor from './components/Editor';
import ActionBar from './components/ActionBar';
import VersionControl from './components/VersionControl';
import VersionComparison from './components/VersionComparison';
import useVersionHistory from './hooks/useVersionHistory';

const INITIAL_CONTENT = '<p>This is an AI-generated response. Feel free to edit and modify this text.</p>';

export const AnswerSection = () => {
  const {
    versions,
    currentVersionId,
    setCurrentVersionId,
    addVersion,
    getCurrentVersion,
    toggleLike,
    toggleBookmark,
  } = useVersionHistory(INITIAL_CONTENT);

  const [editorContent, setEditorContent] = useState(INITIAL_CONTENT);
  const [showComparison, setShowComparison] = useState(false);

  const handleSave = () => {
    addVersion(editorContent);
  };

  const currentVersion = getCurrentVersion();

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4">
          <Editor
            value={editorContent}
            onChange={setEditorContent}
          />
        </div>
        <ActionBar
          onSave={handleSave}
          onLike={() => toggleLike(currentVersionId)}
          onBookmark={() => toggleBookmark(currentVersionId)}
          isLiked={currentVersion?.isLiked}
          isBookmarked={currentVersion?.isBookmarked}
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