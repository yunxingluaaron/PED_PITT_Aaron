import React, { useState, useEffect, useCallback } from 'react';

const Splitter = ({ onDrag, initialPosition, minPosition, maxPosition, containerOffset }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  // Use useCallback to memoize the handler functions
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newPosition = e.clientX - (containerOffset || 0);
      const constrainedPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
      setPosition(constrainedPosition);
      
      // Only call onDrag when the position actually changes
      // This prevents unnecessary re-renders
      if (constrainedPosition !== position) {
        onDrag(constrainedPosition);
      }
    }
  }, [isDragging, minPosition, maxPosition, containerOffset, onDrag, position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Initial position setup - only run once on component mount or when props change
  useEffect(() => {
    // Only update if initial position changed and is different from current position
    if (initialPosition !== position) {
      const constrainedPosition = Math.max(minPosition, Math.min(maxPosition, initialPosition));
      setPosition(constrainedPosition);
      
      // Avoid calling onDrag here, since it can create infinite loops
      // if onDrag changes state that affects initialPosition
    }
  }, [initialPosition, minPosition, maxPosition, position]);

  // Handle mouse events
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  return (
    <div
      className="w-2 bg-gray-300 cursor-col-resize hover:bg-gray-400 relative z-20 flex-shrink-0"
      onMouseDown={handleMouseDown}
      style={{ height: '100%', minHeight: '100vh' }}
    >
      <div className="w-full h-full bg-gray-500 opacity-50 hover:opacity-75" />
    </div>
  );
};

export default React.memo(Splitter);