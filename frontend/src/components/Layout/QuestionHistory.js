// src/components/Layout/QuestionHistory.js
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { getQuestionHistory } from '../../services/questionApi';

const QuestionHistory = ({ onQuestionSelect }) => {
  const [questions, setQuestions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await getQuestionHistory();
        setQuestions(data);
      } catch (error) {
        console.error('Failed to load questions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, []);

  return (
    <div className="border-t border-gray-200 mt-4">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-gray-700">Question History</h3>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </div>
      
      {isExpanded && (
        <div className="px-4 py-2">
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : questions.length === 0 ? (
            <div className="text-sm text-gray-500">No questions yet</div>
          ) : (
            <div className="space-y-2">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="text-sm text-gray-600 hover:bg-gray-100 p-2 rounded cursor-pointer"
                  onClick={() => onQuestionSelect(question)}
                >
                  {question.content}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(question.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionHistory;