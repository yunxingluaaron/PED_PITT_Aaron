import React, { useState, useEffect, useRef } from 'react';
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
    questions: { width: 400, height: 800 },
    answers: { width: 400, height: 800 },
  });
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);
  const sidebarRef = useRef(null);

  // 动态计算可用宽度并更新 dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const sidebarWidth = sidebarRef.current
        ? sidebarRef.current.offsetWidth
        : isCollapsed
        ? 60
        : 200;
      const availableWidth = window.innerWidth - sidebarWidth - 40;
      // 确保 questions.width 不超过可用宽度的 70%，留给 answers 足够空间
      const questionWidth = Math.min(dimensions.questions.width, availableWidth * 0.7);
      const answerWidth = availableWidth - questionWidth - 2; // 减去 Splitter 宽度 (2px)
      setDimensions((prev) => ({
        questions: { width: questionWidth, height: window.innerHeight - 100 },
        answers: { width: answerWidth, height: window.innerHeight - 100 },
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
        detailed_response: question.response,
        metadata: question.response_metadata || {},
        isHistoricalAnswer: true,
        parent_name: question.parent_name,
      });
      setCurrentQuestion(question.content);
      setSelectedHistoryQuestion(question);
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
    if (!answer.isHistoricalAnswer) {
      setCurrentAnswer(answer);
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

  const handleSplitterDrag = (newPosition) => {
    const sidebarWidth = sidebarRef.current
      ? sidebarRef.current.offsetWidth
      : isCollapsed
      ? 60
      : 200;
    const availableWidth = window.innerWidth - sidebarWidth - 40;
    const questionWidth = newPosition;
    const answerWidth = availableWidth - questionWidth - 2; // 减去 Splitter 宽度 (2px)
    setDimensions({
      questions: { width: questionWidth, height: dimensions.questions.height },
      answers: { width: answerWidth, height: dimensions.answers.height },
    });
  };

  const getSplitterConstraints = () => {
    const sidebarWidth = sidebarRef.current
      ? sidebarRef.current.offsetWidth
      : isCollapsed
      ? 60
      : 200;
    const availableWidth = window.innerWidth - sidebarWidth - 40;
    return {
      minPosition: 300, // 最小宽度 300px
      maxPosition: availableWidth - 300, // 确保 Answer 面板最小宽度 300px
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
        className={`flex-1 flex p-4 ${
          isSmallScreen ? 'flex-col' : 'flex-row'
        } max-w-full`}
      >
        <div className={`flex-none ${isSmallScreen ? 'mb-4' : ''}`}>
          <ResizablePanel
            width={dimensions.questions.width}
            height={dimensions.questions.height}
            onResize={handleResize('questions')}
            minConstraints={[isSmallScreen ? 200 : 300, 400]}
            maxConstraints={[isSmallScreen ? window.innerWidth - 40 : 800, window.innerHeight - 100]}
            resizeHandles={['s']}
          >
            <div className="p-4 h-full overflow-auto">
              <QuestionSection
                onQuestionSubmit={handleQuestionSubmit}
                isGenerating={isGenerating}
                initialQuestion={selectedHistoryQuestion?.content}
                selectedHistoryQuestion={selectedHistoryQuestion}
                initialParentName={parentName}
              />
            </div>
          </ResizablePanel>
        </div>

        {!isSmallScreen && (
          <Splitter
            onDrag={handleSplitterDrag}
            initialPosition={dimensions.questions.width}
            {...getSplitterConstraints()}
          />
        )}

        <div className={`flex-none ${isSmallScreen ? '' : ''}`}>
          <ResizablePanel
            width={dimensions.answers.width}
            height={dimensions.answers.height}
            onResize={handleResize('answers')}
            minConstraints={[isSmallScreen ? 200 : 300, 400]}
            maxConstraints={[isSmallScreen ? window.innerWidth - 40 : 800, window.innerHeight - 100]}
            resizeHandles={['s']}
            className="ml-auto"
          >
            <div className="p-4 h-full overflow-auto">
              <AnswerSection
                question={currentQuestion}
                questionId={currentQuestionId}
                onAnswerGenerated={handleAnswerGenerated}
                onError={handleGenerationError}
                isGenerating={isGenerating}
                selectedHistoryQuestion={selectedHistoryQuestion}
                currentAnswer={currentAnswer}
                parentName={parentName}
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