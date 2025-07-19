import React, { useState, useRef, useEffect } from 'react';
import ResumePage from '../pages/resume/ResumePage';

// 간단한 아이콘으로 대체
const DragIcon = () => <span style={{ fontSize: '16px' }}>⋮⋮</span>;
const CloseIcon = () => <span style={{ fontSize: '16px' }}>✕</span>;
const ResizeIcon = () => <span style={{ fontSize: '16px' }}>⤡</span>;

export default function DraggableResumeWindow({ 
  id, 
  applicant, 
  resume, 
  onClose, 
  onFocus,
  isActive,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 600, height: 500 }
}) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const windowRef = useRef(null);
  const headerRef = useRef(null);

  // 드래그 시작
  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle')) return;
    
    setIsDragging(true);
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    onFocus(id);
  };

  // 리사이즈 시작
  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  // 마우스 이동 처리
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // 화면 경계 체크
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(64, Math.min(newY, maxY)) // 헤더 높이 고려
        });
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(400, resizeStart.width + deltaX);
        const newHeight = Math.max(300, resizeStart.height + deltaY);
        
        setSize({
          width: newWidth,
          height: newHeight
        });
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
  }, [isDragging, isResizing, dragOffset, resizeStart, size.width, size.height]);

  return (
    <div
      ref={windowRef}
      className={`absolute bg-white dark:bg-gray-800 border-2 rounded-lg shadow-2xl transition-all duration-200 ${
        isActive 
          ? 'border-blue-500 shadow-blue-500/20' 
          : 'border-gray-300 dark:border-gray-600'
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isActive ? 1000 : 999
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 창 헤더 */}
      <div
        ref={headerRef}
        className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-t-lg cursor-move"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex items-center space-x-2">
          <DragIcon />
          <span className="font-semibold text-sm truncate">
            {applicant?.name || '지원자'} - 이력서
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onFocus(id)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <span className="text-xs">포커스</span>
          </button>
          <button
            onClick={() => onClose(id)}
            className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* 창 내용 */}
      <div className="overflow-auto" style={{ height: size.height - 60 }}>
        <ResumePage 
          resume={resume} 
          loading={!resume} 
          error={null}
        />
      </div>

      {/* 리사이즈 핸들 */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <ResizeIcon />
      </div>
    </div>
  );
} 