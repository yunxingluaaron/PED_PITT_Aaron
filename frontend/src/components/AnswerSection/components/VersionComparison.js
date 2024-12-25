// src/components/AnswerSection/components/VersionComparison.js
import React from 'react';
import { diffChars } from 'diff';

const VersionComparison = ({ originalText, modifiedText }) => {
  const diff = diffChars(originalText, modifiedText);

  return (
    <div className="border rounded-lg p-4 mt-4">
      <h3 className="font-semibold mb-2">Version Comparison</h3>
      <div className="space-y-4">
        {diff.map((part, index) => (
          <span
            key={index}
            className={`${
              part.added
                ? 'bg-green-100 text-green-800'
                : part.removed
                ? 'bg-red-100 text-red-800'
                : ''
            }`}
          >
            {part.value}
          </span>
        ))}
      </div>
    </div>
  );
};

export default VersionComparison;