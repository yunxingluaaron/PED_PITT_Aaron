// src/App.js
import React, { useState } from 'react';
import Sidebar from './components/Layout/Sidebar';
import ResizablePanel from './components/Layout/ResizablePanel';
import QuestionSection from './components/QuestionSection';
import AnswerSection from './components/AnswerSection';
import ReferenceSection from './components/ReferenceSection';

const App = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dimensions, setDimensions] = useState({
    questions: { width: 800, height: 200 },
    answers: { width: 800, height: 400 },
    reference: { width: 300, height: 600 }
  });

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
            <QuestionSection />
          </ResizablePanel>

          <ResizablePanel
            width={dimensions.answers.width}
            height={dimensions.answers.height}
            onResize={handleResize('answers')}
            minConstraints={[400, 200]}
            maxConstraints={[1200, 800]}
            resizeHandles={['s']}
          >
            <AnswerSection />
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
          <ReferenceSection />
        </ResizablePanel>
      </div>
    </div>
  );
};

export default App;