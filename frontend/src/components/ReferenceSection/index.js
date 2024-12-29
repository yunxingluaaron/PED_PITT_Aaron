// src/components/ReferenceSection/index.js
import React from 'react';

const ReferenceSection = ({ sources = [] }) => {
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Reference List</h2>
        </div>
        <div className="p-4">
          {sources && sources.length > 0 ? (
            <div className="space-y-2">
              {sources.map((source, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <p className="text-sm text-gray-700">{source}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No references available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferenceSection;