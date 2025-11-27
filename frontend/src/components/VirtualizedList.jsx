import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// 성능 최적화: 가상화된 리스트 컴포넌트
const VirtualizedList = React.memo(({
  items = [],
  itemHeight = 80,
  containerHeight = 400,
  renderItem,
  onItemClick,
  selectedItemId = null,
  className = '',
  emptyMessage = '데이터가 없습니다.'
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // 성능 최적화: 컨테이너 크기 측정
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      
      resizeObserver.observe(containerRef.current);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  // 성능 최적화: 가상화 계산을 useMemo로 최적화
  const virtualizedData = useMemo(() => {
    if (!items.length) return { startIndex: 0, endIndex: 0, visibleItems: [] };

    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // 버퍼 추가
    const endIndex = Math.min(startIndex + visibleCount, items.length);

    const visibleItems = items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      virtualIndex: startIndex + index,
      style: {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight: items.length * itemHeight
    };
  }, [items, scrollTop, itemHeight, containerHeight]);

  // 성능 최적화: 스크롤 핸들러를 useCallback으로 최적화
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // 성능 최적화: 아이템 클릭 핸들러를 useCallback으로 최적화
  const handleItemClick = useCallback((item) => {
    onItemClick?.(item);
  }, [onItemClick]);

  // 성능 최적화: 아이템 렌더링을 useCallback으로 최적화
  const renderVirtualizedItem = useCallback((item) => {
    return (
      <div
        key={item.id || item.virtualIndex}
        style={item.style}
        className="virtualized-item"
      >
        {renderItem(item, handleItemClick, selectedItemId)}
      </div>
    );
  }, [renderItem, handleItemClick, selectedItemId]);

  if (!items.length) {
    return (
      <div 
        ref={containerRef}
        className={`virtualized-list empty ${className}`}
        style={{ height: containerHeight }}
      >
        <div className="flex items-center justify-center h-full text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtualized-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: virtualizedData.totalHeight, position: 'relative' }}>
        {virtualizedData.visibleItems.map(renderVirtualizedItem)}
      </div>
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

// 성능 최적화: 무한 스크롤 가상화 리스트
const InfiniteVirtualizedList = React.memo(({
  items = [],
  itemHeight = 80,
  containerHeight = 400,
  renderItem,
  onItemClick,
  selectedItemId = null,
  onLoadMore,
  hasMore = false,
  loading = false,
  className = '',
  emptyMessage = '데이터가 없습니다.'
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const loadingRef = useRef(null);

  // 성능 최적화: 무한 스크롤 감지
  useEffect(() => {
    if (!loadingRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loading) {
            onLoadMore?.();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, onLoadMore]);

  // 성능 최적화: 가상화 계산
  const virtualizedData = useMemo(() => {
    if (!items.length) return { startIndex: 0, endIndex: 0, visibleItems: [] };

    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
    const endIndex = Math.min(startIndex + visibleCount, items.length);

    const visibleItems = items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      virtualIndex: startIndex + index,
      style: {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight: items.length * itemHeight
    };
  }, [items, scrollTop, itemHeight, containerHeight]);

  // 성능 최적화: 스크롤 핸들러
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // 성능 최적화: 아이템 클릭 핸들러
  const handleItemClick = useCallback((item) => {
    onItemClick?.(item);
  }, [onItemClick]);

  // 성능 최적화: 아이템 렌더링
  const renderVirtualizedItem = useCallback((item) => {
    return (
      <div
        key={item.id || item.virtualIndex}
        style={item.style}
        className="virtualized-item"
      >
        {renderItem(item, handleItemClick, selectedItemId)}
      </div>
    );
  }, [renderItem, handleItemClick, selectedItemId]);

  if (!items.length && !loading) {
    return (
      <div 
        ref={containerRef}
        className={`virtualized-list empty ${className}`}
        style={{ height: containerHeight }}
      >
        <div className="flex items-center justify-center h-full text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtualized-list infinite ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: virtualizedData.totalHeight, position: 'relative' }}>
        {virtualizedData.visibleItems.map(renderVirtualizedItem)}
        
        {/* 로딩 인디케이터 */}
        {hasMore && (
          <div
            ref={loadingRef}
            style={{
              position: 'absolute',
              top: virtualizedData.totalHeight,
              height: 60,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">로딩 중...</span>
              </div>
            ) : (
              <div className="text-sm text-gray-400">더 많은 데이터 로드 중...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

InfiniteVirtualizedList.displayName = 'InfiniteVirtualizedList';

export { VirtualizedList, InfiniteVirtualizedList }; 