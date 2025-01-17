// src/components/AnswerSection/components/Editor.js
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { 
  Bold, 
  Italic, 
  List, 
  Heading2, 
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  RotateCcw
} from 'lucide-react';

const MenuBar = ({ editor, onReset, onClear }) => {
  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, isActive, icon: Icon, title }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-200 ${
        isActive ? 'bg-gray-200' : ''
      }`}
      title={title}
    >
      <Icon size={16} className="text-gray-700" />
    </button>
  );

  const Divider = () => (
    <div className="w-px h-6 bg-gray-300 mx-1" />
  );

  return (
    <div className="border-b border-gray-200 p-2 flex flex-wrap gap-2 bg-gray-50 justify-between">
      <div className="flex flex-wrap gap-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={Bold}
          title="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={Italic}
          title="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          icon={Highlighter}
          title="Highlight"
        />
        <Divider />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={Heading2}
          title="Heading 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={List}
          title="Bullet List"
        />
        <Divider />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          icon={AlignLeft}
          title="Align Left"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          icon={AlignCenter}
          title="Align Center"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          icon={AlignRight}
          title="Align Right"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="p-2 rounded hover:bg-gray-200 text-gray-600"
          title="Reset to original"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={onClear}
          className="p-2 rounded hover:bg-gray-200 text-gray-600"
          title="Clear content"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const Editor = ({ value, onChange, onReset, onClear, readonly = false }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !readonly,
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="w-full border rounded-lg overflow-hidden bg-white h-full flex flex-col">
      <MenuBar editor={editor} onReset={onReset} onClear={onClear} />
      <div className="flex-1 overflow-auto">
        <div className="p-4 prose max-w-none min-h-full">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default Editor;