import React from 'react';
import { HeartIcon, BookmarkIcon, SaveIcon, CopyIcon } from 'lucide-react';

const ActionBar = ({ 
  onSave, 
  onLike, 
  onBookmark, 
  onCopy,  // Add new prop for copy callback
  isLiked, 
  isBookmarked, 
  textToCopy 
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy); // 这个不是在 call backend 函数，是browser-native function available in modern web browsers (part of the Web Clipboard API).
      
      // Call the onCopy callback to save version
      if (onCopy) {
        onCopy(textToCopy);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="flex items-center gap-4 p-2 border-t border-gray-200">
      {/* <button
        onClick={onSave}
        className="flex items-center gap-2 px-3 py-1 text-sm rounded-md 
          bg-blue-500 text-white hover:bg-blue-600"
      >
        <SaveIcon size={16} />
        Save
      </button> */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-1 text-sm rounded-md 
          bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        <CopyIcon size={16} />
        Copy
      </button>
      {/* <button
        onClick={onLike}
        className={`p-1 rounded-md hover:bg-gray-100 ${
          isLiked ? 'text-red-500' : 'text-gray-500'
        }`}
      >
        <HeartIcon size={20} />
      </button>
      <button
        onClick={onBookmark}
        className={`p-1 rounded-md hover:bg-gray-100 ${
          isBookmarked ? 'text-yellow-500' : 'text-gray-500'
        }`}
      >
        <BookmarkIcon size={20} />
      </button> */}
    </div>
  );
};

export default ActionBar;