import React from 'react';

const SourcesDisplay = ({ sources }) => {
  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-lg font-semibold mb-2">Sources Referenced</h3>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div 
            key={index}
            className="p-2 bg-gray-50 rounded-lg border border-gray-200"
          >
            <p className="text-sm text-gray-700">{source}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourcesDisplay;