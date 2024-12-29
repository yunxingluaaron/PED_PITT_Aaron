// src/App.js
import React, { useState } from 'react';
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
  const [dimensions, setDimensions] = useState({
    questions: { width: 800, height: 200 },
    answers: { width: 800, height: 400 },
    reference: { width: 300, height: 600 }
  });

  const handleQuestionSelect = (question) => {
    if (question.isFromHistory) {
      // For historical questions, just load the existing data
      setIsGenerating(false);
      setSelectedHistoryQuestion(question);
      setCurrentQuestion(question.content);
      
      const answer = {
        conversation_id: question.conversation_id,
        detailed_response: question.response,
        sources: question.source_data || [],
        metadata: question.response_metadata || {},
        isHistoricalAnswer: true  // Flag to indicate this is a historical answer
      };
      
      setCurrentAnswer(answer);
      setSources(question.source_data || []);
    }
  };


  const handleQuestionSubmit = async (question) => {
    // Only generate new answers for new questions
    if (!selectedHistoryQuestion?.isFromHistory || question !== selectedHistoryQuestion.content) {
      try {
        setIsGenerating(true);
        setCurrentQuestion(question);
        setSelectedHistoryQuestion(null);  // Reset history selection for new questions
        setCurrentAnswer(null);  // Clear previous answer
      } catch (error) {
        console.error('Error submitting question:', error);
        setIsGenerating(false);
      }
    }
  };

  const handleAnswerGenerated = (answer) => {
    // Only handle answer generation for new questions
    if (!answer.isHistoricalAnswer) {
      setCurrentAnswer(answer);
      setIsGenerating(false);
      if (answer && answer.sources) {
        setSources(answer.sources);
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
        <div className="flex-1 p-4 flex flex-col gap-4">
          <ResizablePanel
            width={dimensions.questions.width}
            height={dimensions.questions.height}
            onResize={handleResize('questions')}
            minConstraints={[400, 100]}
            maxConstraints={[1200, 400]}
            resizeHandles={['s']}
          >
            <QuestionSection 
              onQuestionSubmit={handleQuestionSubmit}
              isGenerating={isGenerating}
              initialQuestion={selectedHistoryQuestion?.content}
            />
          </ResizablePanel>

          <ResizablePanel
            width={dimensions.answers.width}
            height={dimensions.answers.height}
            onResize={handleResize('answers')}
            minConstraints={[400, 200]}
            maxConstraints={[1200, 800]}
            resizeHandles={['s']}
          >
            <AnswerSection 
              question={currentQuestion}
              onAnswerGenerated={handleAnswerGenerated}
              onSourcesUpdate={handleSourcesUpdate}
              onError={handleGenerationError}
              isGenerating={isGenerating}
              selectedHistoryQuestion={selectedHistoryQuestion}
              currentAnswer={currentAnswer}
            />
          </ResizablePanel>
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
          <ReferenceSection sources={sources} />
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