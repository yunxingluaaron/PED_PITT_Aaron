import React, { useState } from 'react';
import { Heart, BookmarkPlus, Save, History, ArrowLeftRight } from 'lucide-react';

// Mock AI-generated content
const initialAIContent = {
  id: 1,
  content: "This is an AI-generated response that can be edited and modified by the user. Feel free to make changes and track different versions.",
  timestamp: new Date().toISOString(),
  isAIGenerated: true
};

const NoteEditor = () => {
  const [currentNote, setCurrentNote] = useState(initialAIContent);
  const [versions, setVersions] = useState([initialAIContent]);
  const [showHistory, setShowHistory] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);

  // Save current version
  const saveVersion = () => {
    const newVersion = {
      id: versions.length + 1,
      content: currentNote.content,
      timestamp: new Date().toISOString(),
      isAIGenerated: false
    };
    setVersions([...versions, newVersion]);
  };

  // Handle text changes
  const handleContentChange = (e) => {
    setCurrentNote({
      ...currentNote,
      content: e.target.value
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Note Editor</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setLiked(!liked)}
            className={`p-2 rounded hover:bg-gray-100 ${liked ? 'text-red-500' : ''}`}
          >
            <Heart size={20} />
          </button>
          <button 
            onClick={() => setBookmarked(!bookmarked)}
            className={`p-2 rounded hover:bg-gray-100 ${bookmarked ? 'text-blue-500' : ''}`}
          >
            <BookmarkPlus size={20} />
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded hover:bg-gray-100"
          >
            <History size={20} />
          </button>
          <button 
            onClick={() => setIsComparing(!isComparing)}
            className="p-2 rounded hover:bg-gray-100"
          >
            <ArrowLeftRight size={20} />
          </button>
        </div>
      </div>

      {isComparing ? (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="mb-2 font-semibold">Original Version</h3>
            <div className="border rounded p-3 bg-gray-50">
              {initialAIContent.content}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Current Version</h3>
            <textarea
              className="w-full h-40 p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={currentNote.content}
              onChange={handleContentChange}
            />
          </div>
        </div>
      ) : (
        <textarea
          className="w-full h-40 p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          value={currentNote.content}
          onChange={handleContentChange}
        />
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={saveVersion}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Save size={16} />
          Save Version
        </button>
      </div>

      {showHistory && (
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Version History</h3>
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setCurrentNote(version)}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(version.timestamp).toLocaleString()}
                  </span>
                  <span className="text-sm font-medium">
                    {version.isAIGenerated ? "AI Generated" : "User Edit"}
                  </span>
                </div>
                <p className="text-sm line-clamp-2">{version.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;