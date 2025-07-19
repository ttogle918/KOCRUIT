import React, { useState, useRef, useEffect } from 'react';
import { MdDragIndicator, MdClose, MdExpand, MdCompress } from 'react-icons/md';

const DraggablePanel = ({
  id,
  title,
  children,
  initialPosition = { x: 0, y: 0 },
  initialSize = { width: 400, height: 300 },
  minSize = { width: 200, height: 150 },
  maxSize = { width: 800, height: 600 },
  onMove,
  onResize,
  onClose,
  onExpand,
  onCompress,
  isExpanded = false,
  zIndex = 1000,
  className = ''
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState(null);
  
  const panelRef = useRef(null);
  const dragHandleRef = useRef(null);

  // 드래그 시작
  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('.panel-actions')) {
      return;
    }
    
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  // 리사이즈 시작
  const handleResizeStart = (e, direction) => {
    setIsResizing(true);
    setResizeDirection(direction);
    e.stopPropagation();
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
        
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));
        
        setPosition({ x: clampedX, y: clampedY });
        onMove && onMove(id, { x: clampedX, y: clampedY });
      }
      
      if (isResizing) {
        const rect = panelRef.current.getBoundingClientRect();
        let newWidth = size.width;
        let newHeight = size.height;
        
        if (resizeDirection.includes('right')) {
          newWidth = e.clientX - rect.left;
        }
        if (resizeDirection.includes('left')) {
          newWidth = rect.right - e.clientX;
          setPosition(prev => ({ ...prev, x: e.clientX }));
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = e.clientY - rect.top;
        }
        if (resizeDirection.includes('top')) {
          newHeight = rect.bottom - e.clientY;
          setPosition(prev => ({ ...prev, y: e.clientY }));
        }
        
        // 최소/최대 크기 제한
        newWidth = Math.max(minSize.width, Math.min(newWidth, maxSize.width));
        newHeight = Math.max(minSize.height, Math.min(newHeight, maxSize.height));
        
        setSize({ width: newWidth, height: newHeight });
        onResize && onResize(id, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeDirection, size, minSize, maxSize, onMove, onResize, id]);

  return (
    <div
      ref={panelRef}
      className={`absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg ${className}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: zIndex,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 헤더 */}
      <div 
        ref={dragHandleRef}
        className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center space-x-2">
          <MdDragIndicator className="text-gray-400" size={16} />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{title}</h3>
        </div>
        
        <div className="flex items-center space-x-1 panel-actions">
          {onExpand && !isExpanded && (
            <button
              onClick={() => onExpand(id)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
              title="확장"
            >
              <MdExpand size={16} />
            </button>
          )}
          {onCompress && isExpanded && (
            <button
              onClick={() => onCompress(id)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
              title="축소"
            >
              <MdCompress size={16} />
            </button>
          )}
          {onClose && (
            <button
              onClick={() => onClose(id)}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
              title="닫기"
            >
              <MdClose size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-auto" style={{ height: `calc(100% - 48px)` }}>
        {children}
      </div>

      {/* 리사이즈 핸들 */}
      <div className="resize-handle resize-handle-right" onMouseDown={(e) => handleResizeStart(e, 'right')} />
      <div className="resize-handle resize-handle-bottom" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
      <div className="resize-handle resize-handle-corner" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
    </div>
  );
};

export default DraggablePanel; 