// src/components/AnswerSection/components/Editor.js
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 p-2 flex gap-2">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
      >
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`p-1 rounded ${editor.isActive('highlight') ? 'bg-gray-200' : ''}`}
      >
        Highlight
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
      >
        Bullet List
      </button>
    </div>
  );
};

const Editor = ({ value, onChange }) => {
  return (
    <div className="w-full min-h-[200px] border rounded-lg p-4">
      <textarea
        className="w-full h-full min-h-[180px] resize-none focus:outline-none"
        value={value || ''} // Ensure a default empty string
        onChange={(e) => onChange(e.target.value)}
        placeholder="AI generated response will appear here..."
      />
    </div>
  );
};

export default Editor;