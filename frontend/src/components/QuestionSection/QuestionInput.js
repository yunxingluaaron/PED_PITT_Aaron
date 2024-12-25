import React from 'react';

const QuestionInput = ({ value, onChange, onSubmit }) => {
  return (
    <form onSubmit={onSubmit} className="mb-4">
      <textarea
        value={value}
        onChange={onChange}
        className="w-full p-3 border border-gray-300 rounded-lg 
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          min-h-[80px] resize-none"
        placeholder="Type your question here..."
      />
    </form>
  );
};

export default QuestionInput;