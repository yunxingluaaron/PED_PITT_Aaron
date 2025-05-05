import React, { useState, useEffect } from 'react';

const Splitter = ({ onDrag, initialPosition, minPosition, maxPosition, containerOffset }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const constrainedPosition = Math.max(minPosition, Math.min(maxPosition, initialPosition));
    setPosition(constrainedPosition);
    onDrag(constrainedPosition);
  }, [initialPosition, minPosition, maxPosition, onDrag]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newPosition = e.clientX - (containerOffset || 0);
      const constrainedPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
      setPosition(constrainedPosition);
      onDrag(constrainedPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

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

export default Splitter;