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

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" />;
};

// Main Dashboard Layout Component
const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [dimensions, setDimensions] = useState({
    questions: { width: 800, height: 200 },
    answers: { width: 800, height: 400 },
    reference: { width: 300, height: 600 }
  });

  const handleQuestionSubmit = (question) => {
    setCurrentQuestion(question);
  };

  const handleAnswerGenerated = (answer) => {
    setCurrentAnswer(answer);
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      
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
            <QuestionSection onQuestionSubmit={handleQuestionSubmit} />
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
        >
          <ReferenceSection answer={currentAnswer} />
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
        {/* Auth Routes */}
        <Route 
          path="/login" 
          element={isLoggedIn ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        <Route 
          path="/signup" 
          element={isLoggedIn ? <Navigate to="/dashboard" /> : <SignupPage />} 
        />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        />

        {/* Redirect root to dashboard or login based on auth state */}
        <Route
          path="/"
          element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
        />

        {/* Catch all route - redirect to dashboard or login */}
        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  );
};

export default App;