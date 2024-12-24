import React from 'react';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  return (
    <div 
      className={`bg-white border-r border-gray-200 transition-all duration-300 relative
        ${isCollapsed ? 'w-0' : 'w-64'}`}
    >
      <button
        onClick={toggleSidebar}
        className="absolute top-4 right-[-40px] bg-white border border-gray-200 
          rounded-full p-2 hover:bg-gray-100 shadow-sm z-50"
      >
        {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
      </button>
      
      <div className={`p-4 ${isCollapsed ? 'hidden' : 'block'}`}>
        <h2 className="text-xl font-bold mb-4">Sidebar</h2>
        {/* Add your sidebar content here */}
      </div>
    </div>
  );
};

export default Sidebar;