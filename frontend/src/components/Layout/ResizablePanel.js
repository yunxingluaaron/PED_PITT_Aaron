import React from 'react';
import { Resizable } from 'react-resizable';

const ResizablePanel = ({
  children,
  width,
  height,
  onResize,
  minConstraints,
  maxConstraints,
  resizeHandles,
  className = ''
}) => {
  return (
    <Resizable
      width={width}
      height={height}
      onResize={onResize}
      minConstraints={minConstraints}
      maxConstraints={maxConstraints}
      resizeHandles={resizeHandles}
      className="relative" // Add relative positioning
    >
      <div 
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          position: 'relative' // Add relative positioning
        }} 
        className={`border border-gray-200 bg-white ${className}`}
      >
        {children}
        {resizeHandles.includes('s') && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-100 cursor-row-resize hover:bg-gray-200" />
        )}
      </div>
    </Resizable>
  );
};

export default ResizablePanel;