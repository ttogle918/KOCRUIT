import React, { useState, useRef, useEffect } from 'react';

// 드래그 가능한 패널 컴포넌트
const DraggablePanel = ({ title, children, initialSize = { width: 500, height: 400 }, onSizeChange }) => {
  const [size, setSize] = useState(initialSize);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const resizeRef = useRef(null);

  const handleMouseDown = (e, type) => {
    e.preventDefault();
    if (type === 'resize') {
      setIsResizing(true);
    } else {
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition(prev => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY
        }));
      } else if (isResizing) {
        const newWidth = Math.max(400, size.width + e.movementX);
        const newHeight = Math.max(300, size.height + e.movementY);
        const newSize = { width: newWidth, height: newHeight };
        setSize(newSize);
        onSizeChange?.(newSize);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, size.width, size.height, onSizeChange]);

  return (
    <div
      ref={panelRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50"
      style={{
        width: size.width,
        height: size.height,
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* 헤더 */}
      <div
        className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-t-lg cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-white">{title}</h3>
          <div className="flex space-x-1">
            <button className="w-2 h-2 bg-green-500 rounded-full"></button>
            <button className="w-2 h-2 bg-yellow-500 rounded-full"></button>
            <button className="w-2 h-2 bg-red-500 rounded-full"></button>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4 overflow-auto" style={{ height: size.height - 60 }}>
        {children}
      </div>

      {/* 리사이즈 핸들 */}
      <div
        ref={resizeRef}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
      >
        <div className="w-full h-full bg-gray-400 rounded-bl-lg"></div>
      </div>
    </div>
  );
};

export default DraggablePanel;
