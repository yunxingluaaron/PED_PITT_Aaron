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

const processContent = (content) => {
  if (!content) return '';
  
  // Split content into lines for better processing
  let lines = content.split('\n');
  let inList = false;
  let listItems = [];
  let processedLines = [];
  let inParagraph = false;
  
  const processInlineMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="editor-inline-code">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="editor-link">$1</a>');
  };

  lines.forEach((line, index) => {
    let processedLine = line.trim();
    
    // Skip empty lines but maintain spacing
    if (!processedLine) {
      if (inList) {
        processedLines.push(`<ul class="editor-list">${listItems.join('')}</ul>`);
        inList = false;
        listItems = [];
      }
      if (inParagraph) {
        processedLines.push('</p>');
        inParagraph = false;
      }
      processedLines.push('<br/>');
      return;
    }

    // Process headers
    if (processedLine.startsWith('#')) {
      if (inParagraph) {
        processedLines.push('</p>');
        inParagraph = false;
      }
      if (inList) {
        processedLines.push(`<ul class="editor-list">${listItems.join('')}</ul>`);
        inList = false;
        listItems = [];
      }
      
      const level = processedLine.match(/^#+/)[0].length;
      const text = processInlineMarkdown(processedLine.replace(/^#+\s+/, ''));
      processedLines.push(`<h${level} class="editor-h${level}">${text}</h${level}>`);
      return;
    }

    // Process lists
    if (processedLine.startsWith('- ') || processedLine.startsWith('* ')) {
      if (inParagraph) {
        processedLines.push('</p>');
        inParagraph = false;
      }
      
      if (!inList) {
        inList = true;
        listItems = [];
      }
      
      const listContent = processInlineMarkdown(processedLine.substring(2));
      listItems.push(`<li class="editor-list-item">${listContent}</li>`);
      return;
    }

    // Handle regular paragraphs
    if (inList) {
      processedLines.push(`<ul class="editor-list">${listItems.join('')}</ul>`);
      inList = false;
      listItems = [];
    }

    if (!inParagraph) {
      processedLines.push('<p class="editor-paragraph">');
      inParagraph = true;
    } else {
      processedLines.push('<br/>');
    }
    
    processedLines.push(processInlineMarkdown(processedLine));
  });

  // Clean up any remaining open tags
  if (inList) {
    processedLines.push(`<ul class="editor-list">${listItems.join('')}</ul>`);
  }
  if (inParagraph) {
    processedLines.push('</p>');
  }

  return processedLines.join('\n');
};

const editorStyles = `
  .ProseMirror {
    min-height: 100%;
    padding: 0;  // Remove default padding
  }

  .ProseMirror:focus {
    outline: none;
  }

  .editor-h1 {
    font-size: 1.8em;
    font-weight: bold;
    margin: 0.5em 0 0.2em;  // Significantly reduced margins
    color: #111827;
  }

  .editor-h2 {
    font-size: 1.4em;
    font-weight: bold;
    margin: 0.4em 0 0.2em;  // Significantly reduced margins
    color: #1F2937;
  }

  .editor-h3 {
    font-size: 1.2em;
    font-weight: bold;
    margin: 0.3em 0 0.2em;  // Significantly reduced margins
    color: #374151;
  }

  .editor-paragraph {
    margin: 0.2em 0;        // Minimal margins
    line-height: 1.4;       // Reduced line height
    color: #4B5563;
  }

  .editor-list {
    margin: 0.2em 0 0.2em 1.5em;  // Reduced vertical margins
    list-style-type: disc;
  }

  .editor-list-item {
    margin: 0.1em 0;        // Minimal margins between list items
    line-height: 1.4;       // Match paragraph line height
  }

  // Reduce space after the last element in a section
  .editor-paragraph:last-child,
  .editor-list:last-child,
  .editor-h1:last-child,
  .editor-h2:last-child,
  .editor-h3:last-child {
    margin-bottom: 0.1em;
  }

  // Reduce space before the first element in a section
  .editor-paragraph:first-child,
  .editor-list:first-child,
  .editor-h1:first-child,
  .editor-h2:first-child,
  .editor-h3:first-child {
    margin-top: 0.1em;
  }

  .editor-inline-code {
    background-color: #F3F4F6;
    padding: 0.1em 0.2em;   // Reduced padding
    border-radius: 0.25em;
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
  }

  blockquote {
    border-left: 4px solid #E5E7EB;
    margin: 0.3em 0;        // Reduced margins
    padding-left: 0.8em;    // Reduced padding
    color: #6B7280;
  }

  // Add some spacing between sections
  .editor-h2 {
    padding-top: 0.3em;    // Small padding above new sections
  }

  // Remove excess spacing in the container
  .prose {
    margin: 0 !important;
    padding: 0.5em !important;
  }
`;

const Editor = ({ value, onChange, onReset, onClear, readonly = false }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: true
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true
        }
      }),
      Highlight
    ],
    content: processContent(value),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !readonly,
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const processedContent = processContent(value);
      editor.commands.setContent(processedContent);
    }
  }, [value, editor]);

  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!readonly);
    }
  }, [readonly, editor]);

  React.useEffect(() => {
    // Add styles to document
    const styleSheet = document.createElement('style');
    styleSheet.textContent = editorStyles;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div className="w-full border rounded-lg overflow-hidden bg-white h-full flex flex-col">
      {!readonly && <MenuBar editor={editor} onReset={onReset} onClear={onClear} />}
      <div className="flex-1 overflow-auto">
        <div className="p-4 prose max-w-none min-h-full">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default Editor;