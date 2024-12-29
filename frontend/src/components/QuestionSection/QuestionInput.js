// src/components/QuestionSection/QuestionInput.js
import React from 'react';
import { X } from 'lucide-react';

const QuestionInput = ({ value, onChange, onSubmit, loading, onClear }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading && value.trim()) {
      onSubmit(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full p-3 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            min-h-[80px] resize-none transition-colors duration-200
            ${loading ? 'bg-gray-100' : 'bg-white'}
            pr-24
          `}
          placeholder="Type your question here..."
          disabled={loading}
        />
        
        {/* Clear button */}
        {value && !loading && (
          <button
            type="button"
            onClick={onClear}
            className="absolute top-3 right-20 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            title="Clear question"
          >
            <X size={18} />
          </button>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className={`
            absolute bottom-3 right-3 px-4 py-1 rounded-lg
            transition-all duration-200
            ${loading 
              ? 'bg-gray-400' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            text-white disabled:opacity-50 flex items-center gap-2
            min-w-[90px] justify-center
          `}
        >
          {loading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              <span>Working</span>
            </>
          ) : (
            'Ask'
          )}
        </button>
      </div>
    </form>
  );
};

export default QuestionInput;