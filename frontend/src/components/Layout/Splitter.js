import React, { useState, useEffect, useCallback } from 'react';

const Splitter = ({ onDrag, initialPosition, minPosition, maxPosition, containerOffset }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  // 验证传入的 props 是否有效
  useEffect(() => {
    if (typeof initialPosition !== 'number' || typeof minPosition !== 'number' || typeof maxPosition !== 'number') {
      console.error('Invalid Splitter props:', { initialPosition, minPosition, maxPosition });
    }
    if (initialPosition < minPosition || initialPosition > maxPosition) {
      console.warn('Initial position is out of bounds, clamping to valid range');
      setPosition(Math.max(minPosition, Math.min(maxPosition, initialPosition)));
    }
  }, [initialPosition, minPosition, maxPosition]);

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        const newPosition = e.clientX - (containerOffset || 0);
        const constrainedPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
        setPosition(constrainedPosition);
        onDrag(constrainedPosition);
      }
    },
    [isDragging, minPosition, maxPosition, containerOffset, onDrag]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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