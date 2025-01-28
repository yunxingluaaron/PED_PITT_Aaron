// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/hooks/useAuth';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import Sidebar from './components/Layout/Sidebar';
import ResizablePanel from './components/Layout/ResizablePanel';
import QuestionSection from './components/QuestionSection';
import AnswerSection from './components/AnswerSection';
import ReferenceSection from './components/ReferenceSection';

const PrivateRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" />;
};


const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedHistoryQuestion, setSelectedHistoryQuestion] = useState(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(null); // Add this state
  const [dimensions, setDimensions] = useState({
    questions: { width: 1200, height: 400 },
    answers: { width: 1200, height: 400 },
    reference: { width: 300, height: 600 }
  });

  useEffect(() => {
    console.log('🔄 selectedHistoryQuestion changed:', selectedHistoryQuestion);
  }, [selectedHistoryQuestion]);

  useEffect(() => {
    console.log('🔄 currentQuestion changed:', currentQuestion);
  }, [currentQuestion]);

  useEffect(() => {
    console.log('🔄 isGenerating changed:', isGenerating);
  }, [isGenerating]);

  const handleQuestionSelect = (question) => {
    console.log('🔵 handleQuestionSelect called with:', question);
    
    if (question.isFromHistory) {
      console.log('🔵 Processing historical question');
      setCurrentAnswer({
        id: question.id, // Include question ID
        conversation_id: question.conversation_id,
        detailed_response: question.response,
        sources: question.source_data || [],
        metadata: question.response_metadata || {},
        isHistoricalAnswer: true
      });
      setSources(question.source_data || []);
      setCurrentQuestion(question.content);
      setSelectedHistoryQuestion(question);
      setCurrentQuestionId(question.id); // Set question ID
      setIsGenerating(false);
    }
  };
  
  const handleQuestionSubmit = async (questionData) => {
    console.log('🔵 handleQuestionSubmit called:', {
      questionData,
      isHistorical: selectedHistoryQuestion?.isFromHistory
    });
  
    // Add check for clearOnly flag
    if (questionData.clearOnly) {
      setSelectedHistoryQuestion(null);
      setCurrentAnswer(null);
      setCurrentQuestionId(null);
      return;
    }
  
    if (selectedHistoryQuestion?.isFromHistory && 
        questionData.question === selectedHistoryQuestion.content) {
      console.log('🔵 Skipping submission for historical question');
      return;
    }
  
    try {
      setIsGenerating(true);
      setCurrentQuestion(questionData.question);
      setSelectedHistoryQuestion(null);
      setCurrentAnswer(null);
      setCurrentQuestionId(null);
  
      // Pass the question to AnswerSection
      const answerSection = document.getElementById('answer-section');
      if (answerSection) {
        answerSection.dispatchEvent(new CustomEvent('newQuestion', {
          detail: questionData
        }));
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      setIsGenerating(false);
    }
  };

  const handleAnswerGenerated = (answer) => {
    if (!answer.isHistoricalAnswer) {
      setCurrentAnswer(answer);
      setIsGenerating(false);
      if (answer && answer.sources) {
        setSources(answer.sources);
      }
      if (answer.id) {
        setCurrentQuestionId(answer.id); // Set question ID from new answer
      }
      window.dispatchEvent(new Event('questionAdded'));
    }
  };

  const handleSourcesUpdate = (newSources) => {
    setSources(newSources);
  };

  const handleGenerationError = () => {
    setIsGenerating(false);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleResize = (section) => (e, { size }) => {
    setDimensions(prev => ({
      ...prev,
      [section]: { width: size.width, height: size.height }
    }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggleSidebar={toggleSidebar}
        onQuestionSelect={handleQuestionSelect}
      />
      
      <div className="flex-1 flex">
        <div className="flex-1 p-4 flex flex-col relative"> {/* Added relative positioning */}
          <div className="mb-6"> {/* Increased margin bottom */}
            <ResizablePanel
              width={dimensions.questions.width}
              height={dimensions.questions.height}
              onResize={handleResize('questions')}
              minConstraints={[400, 150]} // Increased minimum height
              maxConstraints={[1200, 800]}
              resizeHandles={['s']}
            >
              <div className="p-4 h-full"> {/* Add padding and full height */}
                <QuestionSection 
                  onQuestionSubmit={handleQuestionSubmit}
                  isGenerating={isGenerating}
                  initialQuestion={selectedHistoryQuestion?.content}
                  selectedHistoryQuestion={selectedHistoryQuestion}
                />
              </div>
            </ResizablePanel>
          </div>
  
          <div className="flex-1">
            <ResizablePanel
              width={dimensions.answers.width}
              height={dimensions.answers.height}
              onResize={handleResize('answers')}
              minConstraints={[400, 400]}
              maxConstraints={[1200, 800]}
              resizeHandles={['s']}
            >
              <div className="p-4 h-full overflow-auto"> {/* Add padding and scrolling */}
                <AnswerSection 
                  question={currentQuestion}
                  questionId={currentQuestionId}
                  onAnswerGenerated={handleAnswerGenerated}
                  onSourcesUpdate={handleSourcesUpdate}
                  onError={handleGenerationError}
                  isGenerating={isGenerating}
                  selectedHistoryQuestion={selectedHistoryQuestion}
                  currentAnswer={currentAnswer}
                />
              </div>
            </ResizablePanel>
          </div>
        </div>
  
        <ResizablePanel
          width={dimensions.reference.width}
          height={dimensions.reference.height}
          onResize={handleResize('reference')}
          minConstraints={[200, 400]}
          maxConstraints={[500, 1000]}
          resizeHandles={['w']}
          className="border-l border-gray-200 bg-white"
        >
          <div className="p-4 h-full overflow-auto">
            <ReferenceSection sources={sources} />
          </div>
        </ResizablePanel>
      </div>
    </div>
  );
};


const App = () => {
  const { isLoggedIn } = useAuth();

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={isLoggedIn ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        <Route 
          path="/signup" 
          element={isLoggedIn ? <Navigate to="/dashboard" /> : <SignupPage />} 
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
        />
        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  );
};

export default App;