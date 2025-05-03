import React, { useState, useEffect } from 'react';

const Splitter = ({ onDrag, initialPosition, minPosition, maxPosition }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // 确保 position 在约束范围内
    const constrainedPosition = Math.max(minPosition, Math.min(maxPosition, initialPosition));
    setPosition(constrainedPosition);
    onDrag(constrainedPosition);
  }, [initialPosition, minPosition, maxPosition]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newPosition = e.clientX - (document.querySelector('.flex-1.flex')?.offsetLeft || 0);
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
  }, [isDragging]);

  return (
    <div
      className="w-2 bg-gray-100 cursor-col-resize hover:bg-gray-200 relative z-10"
      onMouseDown={handleMouseDown}
      style={{ height: '100%' }}
    />
  );
};

export default Splitter;