// src/components/QuestionSection/QuestionInput.js
import React from 'react';

const QuestionInput = ({
  value,
  onChange,
  onSubmit,
  loading,
  onClear,
  isHistoricalQuestion
}) => {
  console.log('🟢 QuestionInput rendered with props:', {
    value,
    loading,
    isHistoricalQuestion
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('🟢 handleSubmit called with value:', value);
    
    if (!value.trim() || loading) {
      console.log('🟢 Submission blocked: empty value or loading');
      return;
    }
    
    console.log('🟢 Calling parent onSubmit');
    onSubmit(value);
  };

  const handleChange = (e) => {
    console.log('🟢 handleChange called with value:', e.target.value);
    onChange(e.target.value);
  };

  const handleClear = () => {
    console.log('🟢 handleClear called');
    onClear();
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Enter your question..."
        className={`w-full p-3 border rounded-lg resize-none ${
          loading ? 'bg-gray-50' : 'bg-white'
        } ${isHistoricalQuestion ? 'border-blue-300' : 'border-gray-300'}`}
        disabled={loading}
        rows={4}
      />
      <div className="absolute bottom-3 right-3 flex gap-2">
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            disabled={loading}
          >
            Clear
          </button>
        )}
        <button
          type="submit"
          className={`px-4 py-1 rounded-md ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : isHistoricalQuestion
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
          disabled={!value.trim() || loading}
        >
          {loading ? 'Processing...' : 'Submit'}
        </button>
      </div>
    </form>
  );
};

export default QuestionInput;