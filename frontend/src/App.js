import React, { useState } from 'react';
import Sidebar from './components/Layout/Sidebar';
import ResizablePanel from './components/Layout/ResizablePanel';

const App = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
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

  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    // Handle question submission here
    console.log('Question submitted:', questionInput);
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
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">Questions Enter</h2>
              
              {/* Question input form */}
              <form onSubmit={handleQuestionSubmit} className="mb-4">
                <textarea
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    min-h-[80px] resize-none"
                  placeholder="Type your question here..."
                />
              </form>

              {/* Dropdown menus */}
              <div className="mt-4 flex gap-2">
                {['Dropdown menu 1', 'Dropdown menu 2', 'Dropdown menu 3', 'Dropdown menu 4'].map((menu, index) => (
                  <select 
                    key={index} 
                    className="border border-gray-300 p-2 rounded-lg focus:ring-2 
                      focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option>{menu}</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                ))}
              </div>
            </div>
          </ResizablePanel>

          {/* Rest of the components remain the same */}
          <ResizablePanel
            width={dimensions.answers.width}
            height={dimensions.answers.height}
            onResize={handleResize('answers')}
            minConstraints={[400, 200]}
            maxConstraints={[1200, 800]}
            resizeHandles={['s']}
          >
            <div className="p-4">
              <h2 className="text-xl font-bold">Answers Generated section</h2>
            </div>
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
          <div className="p-4">
            <h2 className="text-xl font-bold">Reference List</h2>
          </div>
        </ResizablePanel>
      </div>
    </div>
  );
};

export default App;