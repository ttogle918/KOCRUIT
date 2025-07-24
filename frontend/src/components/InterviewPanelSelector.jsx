import React, { useState } from 'react';
import { MdOutlinePerson, MdOutlineSmartToy, MdOutlineSettings, MdOutlineQuestionAnswer, MdOutlineQuiz, MdClose, MdOutlineWork } from 'react-icons/md';

export default function InterviewPanelSelector({ 
  activePanel, 
  onPanelChange, 
  isCollapsed = false,
  onToggleCollapse 
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const panels = [
    {
      id: 'common-questions',
      name: '공통 질문',
      icon: MdOutlineQuestionAnswer,
      description: '공통 면접 질문 및 도구'
    },
    {
      id: 'applicant-questions',
      name: '지원자 질문',
      icon: MdOutlineQuiz,
      description: '지원자별 맞춤 질문'
    },
    {
      id: 'interviewer',
      name: '면접관 평가',
      icon: MdOutlinePerson,
      description: '면접관이 직접 평가하는 패널'
    },
    {
      id: 'ai',
      name: 'AI 평가',
      icon: MdOutlineSmartToy,
      description: 'AI가 실시간으로 평가하는 패널'
    },
    {
      id: 'practical',
      name: '실무진 면접',
      icon: MdOutlineWork,
      description: '실무진 면접용 3단 레이아웃'
    }
  ];

  return (
    <>
      {/* 모달 오버레이 */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                면접 패널 선택
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* 패널 선택 버튼들 */}
            <div className="grid grid-cols-1 gap-3">
              {panels.map((panel) => {
                const IconComponent = panel.icon;
                const isActive = activePanel === panel.id;
                
                return (
                  <button
                    key={panel.id}
                    className={`flex items-center w-full p-4 rounded-lg transition-all duration-200 text-left
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                    onClick={() => {
                      onPanelChange(panel.id);
                      setShowModal(false);
                    }}
                  >
                    <IconComponent size={24} className="mr-3" />
                    <div>
                      <div className="font-semibold">{panel.name}</div>
                      <div className="text-sm opacity-75">{panel.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 오버레이 사이드바 */}
      <div
        className="fixed right-0 top-[64px] dark:bg-gray-800 dark:text-gray-100 bg-white text-gray-900 flex flex-col items-center pt-4 transition-all border-l border-gray-200 dark:border-gray-700 shadow-xl"
        style={{ 
          zIndex: 9999, 
          width: isCollapsed ? (isHovered ? 200 : 80) : 200, 
          height: 'calc(100vh - 64px)',
          transform: 'translateX(0)',
          backgroundColor: document.documentElement.classList.contains('dark') 
            ? 'rgba(31, 41, 55, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* 헤더 */}
      <div className="w-full px-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className={`font-bold text-sm ${isCollapsed && !isHovered ? 'hidden' : 'block'}`}>
            면접 패널
          </h3>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MdOutlineSettings size={16} />
          </button>
        </div>
      </div>

      {/* 패널 선택 버튼들 */}
      <div className="flex flex-col gap-2 w-full px-3">
        {panels.map((panel) => {
          const IconComponent = panel.icon;
          const isActive = activePanel === panel.id;
          
          return (
            <button
              key={panel.id}
              className={`flex items-center w-full h-12 rounded-lg px-3 transition-all duration-200 text-sm font-medium
                ${isCollapsed && !isHovered ? 'justify-center' : 'justify-start'}
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
              onClick={() => onPanelChange(panel.id)}
              title={isCollapsed && !isHovered ? panel.name : ''}
            >
              <IconComponent size={isCollapsed && !isHovered ? 24 : 20} />
              {isCollapsed && !isHovered ? (
                <div className="ml-2 text-xs font-semibold truncate">
                  {panel.name}
                </div>
              ) : (
                <div className="ml-3 text-left">
                  <div className="font-semibold">{panel.name}</div>
                  <div className="text-xs opacity-75">{panel.description}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 상태 표시 */}
      {!(isCollapsed && !isHovered) && (
        <div className="absolute bottom-4 left-3 right-3">
          <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 px-3 py-2 rounded-lg text-xs">
            <div className="font-semibold">패널 상태</div>
            <div>현재: {panels.find(p => p.id === activePanel)?.name}</div>
          </div>
        </div>
      )}
    </div>
    </>
  );
} 