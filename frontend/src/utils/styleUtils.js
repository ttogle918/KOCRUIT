// 스타일 관련 공통 유틸리티 함수들

// 필터 버튼 스타일 함수
export const getButtonStyle = (tab, activeTab) => {
  const base = 'text-xs px-1.5 py-0.5 h-7 min-w-[36px] whitespace-nowrap rounded border font-medium transition';
  const isActive = activeTab === tab;
  
  switch (tab) {
    case 'ALL':
      return `${base} ${
        isActive
          ? 'bg-blue-500 text-white border-blue-500 font-bold'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
      }`;
    case 'SUITABLE':
      return `${base} ${
        isActive
          ? 'bg-blue-600 text-white border-blue-600 font-bold'
          : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
      }`;
    case 'UNSUITABLE':
      return `${base} ${
        isActive
          ? 'bg-red-600 text-white border-red-600 font-bold'
          : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
      }`;
    case 'EXCLUDED':
      return `${base} ${
        isActive
          ? 'bg-gray-600 text-white border-gray-600 font-bold'
          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
      }`;
    default:
      return base;
  }
}; 