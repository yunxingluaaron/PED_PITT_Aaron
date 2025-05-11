import React, { useState } from 'react';
import { HeartIcon, BookmarkIcon, SaveIcon, CopyIcon, CheckIcon } from 'lucide-react';

const ActionBar = ({
  onSave,
  onLike,
  onBookmark,
  onCopy,
  isLiked,
  isBookmarked,
  textToCopy,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      if (onCopy) {
        onCopy(textToCopy);
      }
      setIsCopied(true);
      setShowToast(true);
      setTimeout(() => {
        setIsCopied(false);
        setShowToast(false);
      }, 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="flex items-center gap-4 p-2 border-t border-gray-200">
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-all duration-300 transform
          ${isCopied ? 'bg-green-500 text-white scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'}
          active:scale-95 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
        disabled={!textToCopy}
      >
        {isCopied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        {isCopied ? 'Copied!' : 'Copy'}
      </button>

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg animate-fade-in">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default ActionBar;