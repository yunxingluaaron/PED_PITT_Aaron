import React from 'react';

const QuestionInput = ({ value, onChange, onSubmit, loading }) => {
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
          className="w-full p-3 border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   min-h-[80px] resize-none"
          placeholder="Type your question here..."
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="absolute bottom-3 right-3 bg-blue-500 text-white px-4 py-1 
                   rounded-lg hover:bg-blue-600 disabled:bg-gray-300
                   disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating...' : 'Ask'}
        </button>
      </div>
    </form>
  );
};

export default QuestionInput;