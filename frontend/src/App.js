import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/hooks/useAuth';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import Sidebar from './components/Layout/Sidebar';
import ResizablePanel from './components/Layout/ResizablePanel';
import Splitter from './components/Layout/Splitter';
import QuestionSection from './components/QuestionSection';
import AnswerSection from './components/AnswerSection';

const PrivateRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" />;
};

const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedHistoryQuestion, setSelectedHistoryQuestion] = useState(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [parentName, setParentName] = useState('');
  const [dimensions, setDimensions] = useState({
    questions: { width: 400, height: window.innerHeight },
    answers: { width: 400, height: window.innerHeight },
  });
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);
  const sidebarRef = useRef(null);
  const mainContainerRef = useRef(null);

  useEffect(() => {
    const updateDimensions = () => {
      const sidebarWidth = sidebarRef.current
        ? sidebarRef.current.offsetWidth
        : isCollapsed
        ? 60
        : 200;
      const availableWidth = window.innerWidth - sidebarWidth;
      const questionWidth = Math.min(dimensions.questions.width, availableWidth * 0.7);
      const answerWidth = availableWidth - questionWidth;
      setDimensions((prev) => ({
        questions: { width: questionWidth, height: window.innerHeight },
        answers: { width: answerWidth, height: window.innerHeight },
      }));
      setIsSmallScreen(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, [isCollapsed, dimensions.questions.width]);

  useEffect(() => {
    console.log('🔄 selectedHistoryQuestion changed:', selectedHistoryQuestion);
    if (selectedHistoryQuestion?.parent_name) {
      setParentName(selectedHistoryQuestion.parent_name);
    }
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
        id: question.id,
        conversation_id: question.conversation_id,
        simple_response: question.simple_response || question.response || 'Simplified response not available',
        detailed_response: question.detailed_response || 'Detailed response not available',
        response: question.simple_response || question.response || 'Simplified response not available',
        metadata: question.response_metadata || {},
        isHistoricalAnswer: true,
        parent_name: question.parent_name,
        sources: question.source_data || []
      });
      setCurrentQuestion(question.content);
      setSelectedHistoryQuestion({
        ...question,
        simple_response: question.simple_response || question.response || 'Simplified response not available',
        detailed_response: question.detailed_response || 'Detailed response not available',
        response: question.simple_response || question.response || 'Simplified response not available'
      });
      setCurrentQuestionId(question.id);
      if (question.parent_name) {
        setParentName(question.parent_name);
      }
      setIsGenerating(false);
    }
  };

  const handleQuestionSubmit = async (questionData) => {
    console.log('🔵 handleQuestionSubmit called:', {
      questionData,
      isHistorical: selectedHistoryQuestion?.isFromHistory,
      parentName: questionData.parentName,
    });

    if (questionData.parentName !== undefined) {
      setParentName(questionData.parentName);
    }

    if (questionData.clearOnly) {
      setSelectedHistoryQuestion(null);
      setCurrentAnswer(null);
      setCurrentQuestionId(null);
      if (questionData.clearParentName) {
        setParentName('');
      }
      return;
    }

    if (
      selectedHistoryQuestion?.isFromHistory &&
      questionData.question === selectedHistoryQuestion.content
    ) {
      console.log('🔵 Skipping submission for historical question');
      return;
    }

    try {
      setIsGenerating(true);
      setCurrentQuestion(questionData.question);
      setSelectedHistoryQuestion(null);
      setCurrentAnswer(null);
      setCurrentQuestionId(null);

      const answerSection = document.getElementById('answer-section');
      if (answerSection) {
        const enhancedQuestionData = {
          ...questionData,
          parentName: questionData.parentName || parentName,
        };
        answerSection.dispatchEvent(
          new CustomEvent('newQuestion', {
            detail: enhancedQuestionData,
          })
        );
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      setIsGenerating(false);
    }
  };

  const handleAnswerGenerated = (answer) => {
    console.log('🔵 handleAnswerGenerated called with:', answer);
    if (!answer.isHistoricalAnswer) {
      setCurrentAnswer({
        ...answer,
        simple_response: answer.simple_response || answer.response || 'Simplified response not available',
        detailed_response: answer.detailed_response || 'Detailed response not available',
        response: answer.simple_response || answer.response || 'Simplified response not available'
      });
      setIsGenerating(false);
      if (answer.id) {
        setCurrentQuestionId(answer.id);
      }
      if (answer.parent_name) {
        setParentName(answer.parent_name);
      }
      window.dispatchEvent(new Event('questionAdded'));
    }
  };

  const handleGenerationError = () => {
    setIsGenerating(false);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleResize = (section) => (e, { size }) => {
    console.log(`🔄 Resizing ${section}:`, size);
    setDimensions((prev) => ({
      ...prev,
      [section]: { width: prev[section].width, height: size.height },
    }));
  };

  const handleSplitterDrag = useCallback((newPosition) => {
    const sidebarWidth = sidebarRef.current
      ? sidebarRef.current.offsetWidth
      : isCollapsed
      ? 60
      : 200;
    const availableWidth = window.innerWidth - sidebarWidth;
    const questionWidth = Math.max(300, Math.min(newPosition, availableWidth - 300));
    const answerWidth = availableWidth - questionWidth;
    
    // Only update dimensions if they've actually changed
    setDimensions(prevDimensions => {
      if (
        prevDimensions.questions.width === questionWidth && 
        prevDimensions.answers.width === answerWidth
      ) {
        return prevDimensions; // No change, return previous state to avoid re-render
      }
      
      return {
        questions: { width: questionWidth, height: window.innerHeight },
        answers: { width: answerWidth, height: window.innerHeight },
      };
    });
  }, [isCollapsed]);

  const getSplitterConstraints = () => {
    const sidebarWidth = sidebarRef.current
      ? sidebarRef.current.offsetWidth
      : isCollapsed
      ? 60
      : 200;
    const availableWidth = window.innerWidth - sidebarWidth;
    return {
      minPosition: 300,
      maxPosition: availableWidth - 300,
    };
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-50">
      <div ref={sidebarRef}>
        <Sidebar
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          onQuestionSelect={handleQuestionSelect}
        />
      </div>

      <div
        ref={mainContainerRef}
        className={`flex-1 flex ${
          isSmallScreen ? 'flex-col' : 'flex-row'
        } max-w-full h-full`}
      >
        <div className={`flex-none ${isSmallScreen ? 'mb-4 w-full' : ''}`}>
          <ResizablePanel
            width={dimensions.questions.width}
            height={dimensions.questions.height}
            onResize={handleResize('questions')}
            minConstraints={[isSmallScreen ? 200 : 300, window.innerHeight]}
            maxConstraints={[isSmallScreen ? window.innerWidth : 800, window.innerHeight]}
            resizeHandles={['s']}
            className={isSmallScreen ? 'w-full' : ''}
          >
            <div className="flex flex-col h-full min-h-full">
              <QuestionSection
                onQuestionSubmit={handleQuestionSubmit}
                isGenerating={isGenerating}
                initialQuestion={selectedHistoryQuestion?.content}
                selectedHistoryQuestion={selectedHistoryQuestion}
                initialParentName={parentName}
                className="flex-1 overflow-auto"
              />
            </div>
          </ResizablePanel>
        </div>

        {!isSmallScreen && (
          <Splitter
            onDrag={handleSplitterDrag}
            initialPosition={dimensions.questions.width}
            minPosition={getSplitterConstraints().minPosition}
            maxPosition={getSplitterConstraints().maxPosition}
            containerOffset={mainContainerRef.current?.offsetLeft || 0}
          />
        )}

        <div className={`flex-none ${isSmallScreen ? 'w-full' : ''}`}>
          <ResizablePanel
            width={dimensions.answers.width}
            height={dimensions.answers.height}
            onResize={handleResize('answers')}
            minConstraints={[isSmallScreen ? 200 : 300, window.innerHeight]}
            maxConstraints={[isSmallScreen ? window.innerWidth : 800, window.innerHeight]}
            resizeHandles={['s']}
            className={isSmallScreen ? 'w-full' : 'ml-auto'}
          >
            <div className="flex flex-col h-full min-h-full">
              <AnswerSection
                question={currentQuestion}
                questionId={currentQuestionId}
                onAnswerGenerated={handleAnswerGenerated}
                onError={handleGenerationError}
                isGenerating={isGenerating}
                selectedHistoryQuestion={selectedHistoryQuestion}
                currentAnswer={currentAnswer}
                parentName={parentName}
                className="flex-1 overflow-auto"
              />
            </div>
          </ResizablePanel>
        </div>
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