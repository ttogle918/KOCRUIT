import React from 'react';

/**
 * 미디어 지표를 표시하는 공통 박스 컴포넌트
 */
const MetricBox = ({ label, value, title, unit, color, bgColor, borderColor }) => {
  // label 또는 title 중 하나를 라벨로 사용
  const displayLabel = label || title;
  
  return (
    <div className={`p-3 ${bgColor || 'bg-gray-50'} rounded-xl border ${borderColor || 'border-gray-100'} hover:bg-white hover:shadow-sm transition-all`}>
      <p className={`text-[10px] font-black ${color ? color.replace('text-', 'text-opacity-70 text-') : 'text-gray-400'} mb-1 uppercase tracking-tighter`}>
        {displayLabel}
      </p>
      <p className={`text-sm font-black ${color || 'text-gray-900'}`}>
        {value}{unit}
      </p>
    </div>
  );
};

export default MetricBox;

