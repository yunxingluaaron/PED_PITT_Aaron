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


// src/App.js - Updated DashboardLayout Component
const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedHistoryQuestion, setSelectedHistoryQuestion] = useState(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [parentName, setParentName] = useState(''); // Add state for parent name
  const [dimensions, setDimensions] = useState({
    questions: { width: 1200, height: 400 },
    answers: { width: 1200, height: 400 },
    reference: { width: 300, height: 600 }
  });

  useEffect(() => {
    console.log('🔄 selectedHistoryQuestion changed:', selectedHistoryQuestion);
    // If selecting a history question, also set its parent name if available
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
        sources: question.source_data || [],
        metadata: question.response_metadata || {},
        isHistoricalAnswer: true,
        parent_name: question.parent_name // Include parent name in current answer
      });
      setSources(question.source_data || []);
      setCurrentQuestion(question.content);
      setSelectedHistoryQuestion(question);
      setCurrentQuestionId(question.id);
      // Set parent name if available in the history question
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
      parentName: questionData.parentName // Log the parent name
    });
  
    // Store parent name in state
    if (questionData.parentName !== undefined) {
      setParentName(questionData.parentName);
    }

    // Add check for clearOnly flag
    if (questionData.clearOnly) {
      setSelectedHistoryQuestion(null);
      setCurrentAnswer(null);
      setCurrentQuestionId(null);
      // Only clear parent name if explicitly told to
      if (questionData.clearParentName) {
        setParentName('');
      }
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
  
      // Pass the question and parent name to AnswerSection
      const answerSection = document.getElementById('answer-section');
      if (answerSection) {
        // Include parent name in the event
        const enhancedQuestionData = {
          ...questionData,
          parentName: questionData.parentName || parentName // Use provided or stored parent name
        };
        
        answerSection.dispatchEvent(new CustomEvent('newQuestion', {
          detail: enhancedQuestionData
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
        setCurrentQuestionId(answer.id);
      }
      // If the answer includes a parent name, update the state
      if (answer.parent_name) {
        setParentName(answer.parent_name);
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
        <div className="flex-1 p-4 flex flex-col relative">
          <div className="mb-6">
            <ResizablePanel
              width={dimensions.questions.width}
              height={dimensions.questions.height}
              onResize={handleResize('questions')}
              minConstraints={[400, 150]}
              maxConstraints={[1200, 800]}
              resizeHandles={['s']}
            >
              <div className="p-4 h-full">
                <QuestionSection 
                  onQuestionSubmit={handleQuestionSubmit}
                  isGenerating={isGenerating}
                  initialQuestion={selectedHistoryQuestion?.content}
                  selectedHistoryQuestion={selectedHistoryQuestion}
                  initialParentName={parentName} // Pass parent name to QuestionSection
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
              <div className="p-4 h-full overflow-auto">
                <AnswerSection 
                  question={currentQuestion}
                  questionId={currentQuestionId}
                  onAnswerGenerated={handleAnswerGenerated}
                  onSourcesUpdate={handleSourcesUpdate}
                  onError={handleGenerationError}
                  isGenerating={isGenerating}
                  selectedHistoryQuestion={selectedHistoryQuestion}
                  currentAnswer={currentAnswer}
                  parentName={parentName} // Pass parent name to AnswerSection
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