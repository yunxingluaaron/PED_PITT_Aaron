// src/components/AnswerSection/components/VersionControl.js
import React from 'react';
import { format } from 'date-fns';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const VersionControl = ({ versions, currentVersion, onVersionSelect }) => {
  return (
    <div className="border-l border-gray-200 w-64 p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Version History</h3>
      <div className="space-y-2">
        {versions.map((version) => (
          <button
            key={version.id}
            onClick={() => onVersionSelect(version.id)}
            className={`w-full text-left p-2 rounded-md transition-colors ${
              currentVersion === version.id
                ? 'bg-blue-50 text-blue-600'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-sm font-medium">
              {version.type === 'ai' ? 'AI Generated' : 'User Edit'}
            </div>
            <div className="text-xs text-gray-500">
              {format(new Date(version.timestamp), 'MMM d, yyyy h:mm a')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VersionControl;