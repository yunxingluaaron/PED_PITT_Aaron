// src/components/AnswerSection/components/ActionBar.js
import React from 'react';
import { HeartIcon, BookmarkIcon, SaveIcon } from 'lucide-react';

const ActionBar = ({ onSave, onLike, onBookmark, isLiked, isBookmarked }) => {
  return (
    <div className="flex items-center gap-4 p-2 border-t border-gray-200">
      <button
        onClick={onSave}
        className="flex items-center gap-2 px-3 py-1 text-sm rounded-md
          bg-blue-500 text-white hover:bg-blue-600"
      >
        <SaveIcon size={16} />
        Save
      </button>
      <button
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
      </button>
    </div>
  );
};

export default ActionBar;