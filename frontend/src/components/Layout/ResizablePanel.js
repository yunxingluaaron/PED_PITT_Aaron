import React from 'react';
import { Resizable } from 'react-resizable';

const ResizablePanel = ({ 
  children, 
  width, 
  height, 
  onResize,
  minConstraints,
  maxConstraints,
  resizeHandles 
}) => {
  return (
    <Resizable
      width={width}
      height={height}
      onResize={onResize}
      minConstraints={minConstraints}
      maxConstraints={maxConstraints}
      resizeHandles={resizeHandles}
    >
      <div style={{ width: `${width}px`, height: `${height}px` }} className="border border-gray-200">
        {children}
      </div>
    </Resizable>
  );
};

export default ResizablePanel;  // Make sure to export the component