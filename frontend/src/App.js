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
  // State declarations
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedHistoryQuestion, setSelectedHistoryQuestion] = useState(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [parentName, setParentName] = useState('');
  const [dimensions, setDimensions] = useState({
    questions: { width: window.innerWidth * 0.5, height: window.innerHeight },
    answers: { width: window.innerWidth * 0.5, height: window.innerHeight },
  });
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  // Refs
  const sidebarRef = useRef(null);
  const mainContainerRef = useRef(null);
  const questionSectionRef = useRef(null);
  const answerSectionRef = useRef(null);

  // Log DOM widths for debugging
  const logDomWidths = useCallback(() => {
    const mainWidth = mainContainerRef.current?.offsetWidth || 'N/A';
    const questionWidth = questionSectionRef.current?.offsetWidth || 'N/A';
    const answerWidth = answerSectionRef.current?.offsetWidth || 'N/A';
    const sidebarWidth = sidebarRef.current?.offsetWidth || (isCollapsed ? 0 : 256);
    const totalWidth = sidebarWidth + mainWidth;
    console.log(`[${new Date().toISOString()}] DOM Widths:`, {
      sidebarWidth,
      mainContainerWidth: mainWidth,
      questionWidth,
      answerWidth,
      totalWidth,
      windowInnerWidth: window.innerWidth,
      overflow: totalWidth > window.innerWidth ? 'Yes' : 'No',
      expectedQuestionWidth: dimensions.questions.width,
      expectedAnswerWidth: dimensions.answers.width,
    });
  }, [isCollapsed, dimensions.questions.width, dimensions.answers.width]);

  // Callbacks
  const updateDimensions = useCallback(() => {
    const sidebarWidth = isCollapsed ? 0 : 256;
    const availableWidth = window.innerWidth - sidebarWidth;
    const questionWidth = Math.min(availableWidth * 0.5, availableWidth - 300);
    const answerWidth = availableWidth - questionWidth;

    console.log(`[${new Date().toISOString()}] updateDimensions:`, {
      sidebarWidth,
      availableWidth,
      questionWidth,
      answerWidth,
      totalWidth: sidebarWidth + questionWidth + answerWidth,
      windowInnerWidth: window.innerWidth,
    });

    setDimensions((prev) => {
      const newDimensions = {
        questions: { width: questionWidth, height: window.innerHeight },
        answers: { width: answerWidth, height: window.innerHeight },
      };
      console.log(`[${new Date().toISOString()}] Setting dimensions:`, newDimensions);
      return newDimensions;
    });
    setIsSmallScreen(window.innerWidth < 768);
    if (window.innerWidth < 768) {
      setIsCollapsed(true);
    }

    // Log DOM widths after update
    setTimeout(logDomWidths, 0);
  }, [isCollapsed, logDomWidths]);

  const handleNewConversation = useCallback(() => {
    console.log('🔵 Starting new conversation');
    setSelectedHistoryQuestion(null);
    setCurrentAnswer(null);
    setCurrentQuestion('');
    setCurrentQuestionId(null);
    setParentName('');
    setIsGenerating(false);

    const answerSection = document.getElementById('answer-section');
    const questionSection = document.getElementById('question-section');
    const resetEvent = new CustomEvent('resetConversation', {
      detail: { timestamp: Date.now(), resetToNew: true },
    });

    if (answerSection) {
      console.log('🔵 Dispatching resetConversation event to AnswerSection');
      answerSection.dispatchEvent(resetEvent);
    } else {
      console.warn('🔵 Could not find answer-section element');
    }
    if (questionSection) {
      console.log('🔵 Dispatching resetConversation event to QuestionSection');
      questionSection.dispatchEvent(resetEvent);
    } else {
      console.warn('🔵 Could not find question-section element');
    }
    console.log('🔵 Dispatching global conversationReset event');
    window.dispatchEvent(new Event('conversationReset'));
  }, []);

  const handleQuestionSubmit = useCallback(
    async (question, conversationAction, parentName, parameters, clearOnly = false) => {
      console.log('🔵 handleQuestionSubmit called:', {
        question,
        conversationAction,
        parentName,
        parameters,
        clearOnly,
        isHistorical: selectedHistoryQuestion?.isFromHistory,
      });

      if (!question?.trim() && !clearOnly) {
        console.error('❌ Question is empty in handleQuestionSubmit');
        setIsGenerating(false);
        return;
      }

      const questionData = {
        question: question?.trim() || '',
        conversationAction: conversationAction || 'continue',
        parentName,
        parameters: parameters || {
          tone: 'balanced',
          detailLevel: 'moderate',
          empathy: 'moderate',
          professionalStyle: 'clinicallyBalanced',
        },
      };

      if (questionData.parentName !== undefined) {
        setParentName(questionData.parentName);
      }

      if (
        selectedHistoryQuestion?.isFromHistory &&
        questionData.question === selectedHistoryQuestion.content &&
        !clearOnly
      ) {
        console.log('🔵 Skipping submission for historical question');
        return;
      }

      try {
        if (!clearOnly) {
          setIsGenerating(true);
          setCurrentQuestion(questionData.question);
          setSelectedHistoryQuestion(null);
          setCurrentAnswer(null);
          setCurrentQuestionId(null);
        }

        const answerSection = document.getElementById('answer-section');
        if (answerSection) {
          console.log('📤 Dispatching newQuestion event with:', questionData);
          answerSection.dispatchEvent(
            new CustomEvent('newQuestion', {
              detail: questionData,
            })
          );
        } else {
          console.warn('❌ AnswerSection element not found');
        }
      } catch (error) {
        console.error('Error submitting question:', error);
        setIsGenerating(false);
      }
    },
    [parentName, selectedHistoryQuestion]
  );

  const handleAnswerGenerated = useCallback(
    (answer) => {
      console.log('🔵 handleAnswerGenerated called with:', answer);
      if (!answer.isHistoricalAnswer) {
        setCurrentAnswer({
          ...answer,
          simple_response: answer.simple_response || answer.response || 'Simplified response not available',
          detailed_response: answer.detailed_response || 'Detailed response not available',
          response: answer.simple_response || answer.response || 'Simplified response not available',
        });
        setIsGenerating(false);
        if (answer.id) {
          setCurrentQuestionId(answer.id);
        }
        if (answer.parent_name) {
          setParentName(answer.parent_name);
        }

        setTimeout(() => {
          console.log('🔍 Dispatching questionAdded event');
          window.dispatchEvent(new Event('questionAdded'));
        }, 1000);
      }
    },
    [handleNewConversation]
  );

  const handleGenerationError = useCallback(() => {
    setIsGenerating(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    console.log(`[${new Date().toISOString()}] toggleSidebar: Current isCollapsed:`, isCollapsed);
    setIsCollapsed((prev) => {
      const newState = !prev;
      console.log(`[${new Date().toISOString()}] toggleSidebar: Setting isCollapsed to`, newState);
      setTimeout(() => {
        console.log(`[${new Date().toISOString()}] toggleSidebar: Triggering updateDimensions`);
        updateDimensions();
        logDomWidths();
      }, 100); // Reduced delay to minimize DOM update lag
      return newState;
    });
  }, [isCollapsed, updateDimensions, logDomWidths]);

  const handleResize = useCallback(
    (section) => (e, { size }) => {
      console.log(`[${new Date().toISOString()}] Resizing ${section}:`, size);
      setDimensions((prev) => ({
        ...prev,
        [section]: { width: prev[section].width, height: size.height },
      }));
    },
    []
  );

  const handleSplitterDrag = useCallback(
    (newPosition) => {
      const sidebarWidth = isCollapsed ? 0 : 256;
      const availableWidth = window.innerWidth - sidebarWidth;
      const questionWidth = Math.max(300, Math.min(newPosition, availableWidth - 300));
      const answerWidth = availableWidth - questionWidth;

      console.log(`[${new Date().toISOString()}] handleSplitterDrag:`, {
        newPosition,
        sidebarWidth,
        availableWidth,
        questionWidth,
        answerWidth,
        totalWidth: sidebarWidth + questionWidth + answerWidth,
      });

      setDimensions((prev) => {
        if (
          prev.questions.width === questionWidth &&
          prev.answers.width === answerWidth
        ) {
          return prev;
        }
        const newDimensions = {
          questions: { width: questionWidth, height: window.innerHeight },
          answers: { width: answerWidth, height: window.innerHeight },
        };
        console.log(`[${new Date().toISOString()}] Setting dimensions:`, newDimensions);
        return newDimensions;
      });

      // Log DOM widths after update
      setTimeout(logDomWidths, 0);
    },
    [isCollapsed, logDomWidths]
  );

  const getSplitterConstraints = useCallback(() => {
    const sidebarWidth = isCollapsed ? 0 : 256;
    const availableWidth = window.innerWidth - sidebarWidth;
    const constraints = {
      minPosition: 300,
      maxPosition: availableWidth - 300,
    };
    console.log(`[${new Date().toISOString()}] getSplitterConstraints:`, {
      sidebarWidth,
      availableWidth,
      constraints,
    });
    return constraints;
  }, [isCollapsed]);

  const handleQuestionSelect = (question) => {
    console.log('🔵 handleQuestionSelect called with:', question);
    if (!question) {
      console.log('🔵 Clearing question and answer sections');
      handleNewConversation();
      return;
    }
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
        sources: question.source_data || [],
      });
      setCurrentQuestion(question.content);
      setSelectedHistoryQuestion({
        ...question,
        simple_response: question.simple_response || question.response || 'Simplified response not available',
        detailed_response: question.detailed_response || 'Detailed response not available',
        response: question.simple_response || question.response || 'Simplified response not available',
      });
      setCurrentQuestionId(question.id);
      if (question.parent_name) {
        setParentName(question.parent_name);
      }
      setIsGenerating(false);
    }
  };

  // Effects
  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    console.log(`[${new Date().toISOString()}] isCollapsed changed:`, isCollapsed);
    const sidebarWidth = isCollapsed ? 0 : 256;
    const availableWidth = window.innerWidth - sidebarWidth;
    const newQuestionWidth = Math.min(availableWidth * 0.5, availableWidth - 300);
    console.log(`[${new Date().toISOString()}] Resetting Splitter position:`, {
      sidebarWidth,
      availableWidth,
      newQuestionWidth,
    });
    handleSplitterDrag(newQuestionWidth);

    // Force DOM reflow
    if (mainContainerRef.current) {
      mainContainerRef.current.style.display = 'none';
      const offsetHeight = mainContainerRef.current.offsetHeight; // Fix ESLint no-unused-expressions
      mainContainerRef.current.style.display = 'flex';
      console.log(`[${new Date().toISOString()}] DOM reflow triggered`);
    }

    // Log DOM widths
    setTimeout(logDomWidths, 0);
  }, [isCollapsed, handleSplitterDrag, logDomWidths]);

  // Monitor dimensions.questions.width changes
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] dimensions.questions.width changed:`, dimensions.questions.width);
    handleSplitterDrag(dimensions.questions.width);
  }, [dimensions.questions.width, handleSplitterDrag]);

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

  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-50">
      <div ref={sidebarRef}>
        <Sidebar
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          onQuestionSelect={handleQuestionSelect}
          currentQuestionId={currentQuestionId}
        />
      </div>

      <div
        ref={mainContainerRef}
        className={`flex-1 flex ${
          isSmallScreen ? 'flex-col' : 'flex-row'
        } max-w-full h-full overflow-x-hidden`}
        style={{ maxWidth: `calc(100vw - ${isCollapsed ? 0 : 256}px)` }}
      >
        <div
          className={`flex-none ${isSmallScreen ? 'mb-4 w-full' : ''}`}
          style={{ width: isSmallScreen ? '100%' : dimensions.questions.width }}
          ref={questionSectionRef}
        >
          <ResizablePanel
            width={dimensions.questions.width}
            height={dimensions.questions.height}
            onResize={handleResize('questions')}
            minConstraints={[isSmallScreen ? 200 : 300, window.innerHeight]}
            maxConstraints={[isSmallScreen ? window.innerWidth : 800, window.innerHeight]}
            resizeHandles={['s']}
            className={isSmallScreen ? 'w-full' : ''}
          >
            <div className="flex flex-col h-full min-h-full overflow-x-hidden">
              <QuestionSection
                onQuestionSubmit={handleQuestionSubmit}
                isGenerating={isGenerating}
                initialQuestion={selectedHistoryQuestion?.content}
                selectedHistoryQuestion={selectedHistoryQuestion}
                initialParentName={parentName}
                onNewConversation={handleNewConversation}
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

        <div
          className={`flex-none ${isSmallScreen ? 'w-full' : ''}`}
          style={{ width: isSmallScreen ? '100%' : dimensions.answers.width }}
          ref={answerSectionRef}
        >
          <ResizablePanel
            width={dimensions.answers.width}
            height={dimensions.answers.height}
            onResize={handleResize('answers')}
            minConstraints={[isSmallScreen ? 200 : 300, window.innerHeight]}
            maxConstraints={[isSmallScreen ? window.innerWidth : 800, window.innerHeight]}
            resizeHandles={['s']}
            className={isSmallScreen ? 'w-full' : 'ml-auto'}
          >
            <div className="flex flex-col h-full min-h-full overflow-x-hidden">
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