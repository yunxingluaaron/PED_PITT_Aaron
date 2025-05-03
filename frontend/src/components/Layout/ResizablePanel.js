import React from 'react';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

const ResizablePanel = ({
  children,
  width,
  height,
  onResize,
  minConstraints,
  maxConstraints,
  resizeHandles,
  className = '',
}) => {
  return (
    <Resizable
      width={width}
      height={height}
      onResize={onResize}
      minConstraints={minConstraints}
      maxConstraints={maxConstraints}
      resizeHandles={resizeHandles}
      className="relative"
    >
      <div
        style={{
          width: width,
          height: height,
          position: 'relative',
          overflow: 'hidden',
        }}
        className={`border border-gray-200 bg-white ${className}`}
      >
        {children}
        {resizeHandles.includes('s') && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-100 cursor-row-resize hover:bg-gray-200 z-10" />
        )}
      </div>
    </Resizable>
  );
};

export default ResizablePanel;