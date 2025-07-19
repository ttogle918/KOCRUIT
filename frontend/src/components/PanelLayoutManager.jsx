import React, { useState, useEffect } from 'react';
import DraggablePanel from './DraggablePanel';
import './DraggablePanel.css';

const PanelLayoutManager = ({
  panels = [],
  onPanelMove,
  onPanelResize,
  onPanelClose,
  onPanelExpand,
  onPanelCompress,
  layoutMode = 'auto', // 'auto', '2split', '3split', 'vertical'
  className = ''
}) => {
  const [layoutPanels, setLayoutPanels] = useState(panels);
  const [expandedPanel, setExpandedPanel] = useState(null);

  // 패널 이동 처리
  const handlePanelMove = (panelId, newPosition) => {
    setLayoutPanels(prev => 
      prev.map(panel => 
        panel.id === panelId 
          ? { ...panel, position: newPosition }
          : panel
      )
    );
    onPanelMove && onPanelMove(panelId, newPosition);
  };

  // 패널 리사이즈 처리
  const handlePanelResize = (panelId, newSize) => {
    setLayoutPanels(prev => 
      prev.map(panel => 
        panel.id === panelId 
          ? { ...panel, size: newSize }
          : panel
      )
    );
    onPanelResize && onPanelResize(panelId, newSize);
  };

  // 패널 닫기 처리
  const handlePanelClose = (panelId) => {
    setLayoutPanels(prev => prev.filter(panel => panel.id !== panelId));
    if (expandedPanel === panelId) {
      setExpandedPanel(null);
    }
    onPanelClose && onPanelClose(panelId);
  };

  // 패널 확장 처리
  const handlePanelExpand = (panelId) => {
    setExpandedPanel(panelId);
    onPanelExpand && onPanelExpand(panelId);
  };

  // 패널 축소 처리
  const handlePanelCompress = (panelId) => {
    setExpandedPanel(null);
    onPanelCompress && onPanelCompress(panelId);
  };

  // 레이아웃 모드에 따른 자동 배치
  useEffect(() => {
    if (layoutMode === 'auto' && layoutPanels.length > 0) {
      autoLayout();
    }
  }, [layoutMode, layoutPanels.length]);

  // 자동 레이아웃 함수
  const autoLayout = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const panelCount = layoutPanels.length;
    
    let newLayout = [...layoutPanels];
    
    if (panelCount === 1) {
      // 단일 패널: 화면 중앙에 배치
      newLayout[0] = {
        ...newLayout[0],
        position: { 
          x: (screenWidth - 600) / 2, 
          y: (screenHeight - 400) / 2 
        },
        size: { width: 600, height: 400 }
      };
    } else if (panelCount === 2) {
      // 2개 패널: 좌우 분할
      const panelWidth = (screenWidth - 40) / 2;
      newLayout[0] = {
        ...newLayout[0],
        position: { x: 20, y: 20 },
        size: { width: panelWidth, height: screenHeight - 40 }
      };
      newLayout[1] = {
        ...newLayout[1],
        position: { x: panelWidth + 20, y: 20 },
        size: { width: panelWidth, height: screenHeight - 40 }
      };
    } else if (panelCount === 3) {
      // 3개 패널: 상단 2개, 하단 1개
      const topHeight = (screenHeight - 60) / 2;
      const bottomHeight = screenHeight - topHeight - 40;
      const panelWidth = (screenWidth - 40) / 2;
      
      newLayout[0] = {
        ...newLayout[0],
        position: { x: 20, y: 20 },
        size: { width: panelWidth, height: topHeight }
      };
      newLayout[1] = {
        ...newLayout[1],
        position: { x: panelWidth + 20, y: 20 },
        size: { width: panelWidth, height: topHeight }
      };
      newLayout[2] = {
        ...newLayout[2],
        position: { x: 20, y: topHeight + 20 },
        size: { width: screenWidth - 40, height: bottomHeight }
      };
    } else {
      // 4개 이상: 그리드 레이아웃
      const cols = Math.ceil(Math.sqrt(panelCount));
      const rows = Math.ceil(panelCount / cols);
      const panelWidth = (screenWidth - 40 - (cols - 1) * 10) / cols;
      const panelHeight = (screenHeight - 40 - (rows - 1) * 10) / rows;
      
      newLayout = newLayout.map((panel, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        return {
          ...panel,
          position: { 
            x: 20 + col * (panelWidth + 10), 
            y: 20 + row * (panelHeight + 10) 
          },
          size: { width: panelWidth, height: panelHeight }
        };
      });
    }
    
    setLayoutPanels(newLayout);
  };

  // 레이아웃 모드 변경
  const changeLayoutMode = (mode) => {
    // 여기서 레이아웃 모드를 변경하고 자동 배치를 트리거할 수 있습니다
    console.log('레이아웃 모드 변경:', mode);
  };

  return (
    <div className={`panel-layout-manager ${className}`}>
      {/* 레이아웃 컨트롤 */}
      <div className="fixed top-4 left-4 z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeLayoutMode('auto')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              layoutMode === 'auto' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            자동
          </button>
          <button
            onClick={() => changeLayoutMode('2split')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              layoutMode === '2split' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            2등분
          </button>
          <button
            onClick={() => changeLayoutMode('3split')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              layoutMode === '3split' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            3등분
          </button>
          <button
            onClick={() => changeLayoutMode('vertical')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              layoutMode === 'vertical' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            상하분할
          </button>
        </div>
      </div>

      {/* 패널들 렌더링 */}
      {layoutPanels.map((panel) => (
        <DraggablePanel
          key={panel.id}
          id={panel.id}
          title={panel.title}
          initialPosition={panel.position}
          initialSize={panel.size}
          onMove={handlePanelMove}
          onResize={handlePanelResize}
          onClose={handlePanelClose}
          onExpand={handlePanelExpand}
          onCompress={handlePanelCompress}
          isExpanded={expandedPanel === panel.id}
          zIndex={panel.zIndex || 1000}
        >
          {panel.content}
        </DraggablePanel>
      ))}
    </div>
  );
};

export default PanelLayoutManager; 