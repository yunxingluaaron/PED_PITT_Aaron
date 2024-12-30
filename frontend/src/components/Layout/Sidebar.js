// src/components/Layout/Sidebar.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Menu,
  LogOut,
  Home,
  Settings,
  User,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../lib/hooks/useAuth';
import { getQuestionHistory, deleteQuestion, getQuestionDetails } from '../../services/questionApi';

const Sidebar = ({ isCollapsed, toggleSidebar, onQuestionSelect }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadQuestionHistory = useCallback(async () => {
    if (isCollapsed) return;
    
    try {
      setLoading(true);
      const data = await getQuestionHistory();
      setQuestions(data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ));
    } catch (error) {
      console.error('Failed to load question history:', error);
    } finally {
      setLoading(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    loadQuestionHistory();
  }, [loadQuestionHistory]);

  // Only reload history when a new question is added
  useEffect(() => {
    const handleQuestionAdded = () => {
      loadQuestionHistory();
    };

    window.addEventListener('questionAdded', handleQuestionAdded);
    return () => {
      window.removeEventListener('questionAdded', handleQuestionAdded);
    };
  }, [loadQuestionHistory]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

// Sidebar.js
const handleQuestionClick = async (question, event) => {
  console.log('🖱️ Question clicked:', question);
  
  // Prevent triggering if clicking the delete button
  if (event.target.closest('.delete-button')) {
    console.log('🚫 Delete button clicked, ignoring question selection');
    return;
  }
  
  if (onQuestionSelect) {
    try {
      console.log('🔍 Fetching full question details for ID:', question.id);
      const fullQuestionData = await getQuestionDetails(question.id);
      
      console.log('📦 Full question data received:', fullQuestionData);
      
      const questionWithHistory = {
        ...fullQuestionData,
        isFromHistory: true
      };
      
      console.log('🎯 Calling onQuestionSelect with:', questionWithHistory);
      onQuestionSelect(questionWithHistory);
    } catch (error) {
      console.error('💥 Failed to fetch question details:', error);
    }
  }
};

  const handleDeleteQuestion = async (questionId, event) => {
    event.stopPropagation(); // Prevent triggering the question selection
    
    try {
      await deleteQuestion(questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const menuItems = [
    { icon: <Home size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <User size={20} />, label: 'Profile', path: '/profile' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
    { icon: <HelpCircle size={20} />, label: 'Help', path: '/help' },
  ];

  return (
    <div
      className={`bg-white border-r border-gray-200 transition-all duration-300 
        flex flex-col h-full relative ${isCollapsed ? 'w-0' : 'w-64'}`}
    >
      <button
        onClick={toggleSidebar}
        className="absolute top-4 right-[-40px] bg-white border border-gray-200 
          rounded-full p-2 hover:bg-gray-100 shadow-sm z-50"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
      </button>

      <div className={`flex-1 flex flex-col ${isCollapsed ? 'hidden' : 'block'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white font-medium">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm 
                text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-gray-200">
          <div
            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100 rounded-md"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          >
            <span className="text-sm font-medium text-gray-700">Question History</span>
            {isHistoryExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {isHistoryExpanded && (
            <div className="mt-2 space-y-1 max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="text-sm text-gray-500 px-2">Loading...</div>
              ) : questions.length === 0 ? (
                <div className="text-sm text-gray-500 px-2">No questions yet</div>
              ) : (
                questions.map((question) => (
                  <div
                    key={question.id}
                    onClick={(e) => handleQuestionClick(question, e)}
                    className="group px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 
                      rounded-md cursor-pointer relative flex justify-between items-start"
                  >
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="truncate">{question.content}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(question.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteQuestion(question.id, e)}
                      className="delete-button absolute right-2 top-2 opacity-0 group-hover:opacity-100
                        p-1 hover:bg-red-50 rounded-md transition-opacity"
                      aria-label="Delete question"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm 
              text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;