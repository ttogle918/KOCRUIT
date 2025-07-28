import React from "react";

// highlights: [{ start: number, end: number }] 또는 하이라이트할 단어 배열 등 다양한 방식 지원 가능
// 🔄 우선순위 기반 하이라이트 카테고리 상수 정의 (빨간색→오렌지색→보라색→파란색→노란색)
export const HIGHLIGHT_CATEGORIES = [
  { key: 'mismatch', label: '직무 불일치', color: '#E53935', bg_color: '#fee2e2', description: '직무 도메인/역할 불일치, 자격요건 미달', priority: 1, emoji: '🔴' },
  { key: 'negative_tone', label: '부정 태도', color: '#FFB74D', bg_color: '#fff8e1', description: '책임회피·공격/비난·비윤리·허위/과장 의심', priority: 2, emoji: '🟠' },
  { key: 'experience', label: '경험·성과·이력·경력', color: '#8B5CF6', bg_color: '#EDE9FE', description: '프로젝트·교육·경력·수상 + 추상표현', priority: 3, emoji: '💜' },
  { key: 'skill_fit', label: '기술 사용 경험', color: '#1976D2', bg_color: '#e0f2fe', description: '도구/언어/프레임워크 실제 사용 근거', priority: 4, emoji: '💙' },
  { key: 'value_fit', label: '인재상 가치', color: '#ffc107', bg_color: '#fef9c3', description: '회사 인재상과 맞는 행동·사례', priority: 5, emoji: '💛' }
];

// experience 하이라이트를 sub_label별로 분리
function getHighlightCategoryKey(highlight) {
  if (highlight.category === 'experience') return 'experience';
  return highlight.category;
}

// 우선순위 가져오기 헬퍼 함수
function getPriority(category) {
  const priorityMap = {
    'mismatch': 1,
    'negative_tone': 2,
    'experience': 3,
    'skill_fit': 4,
    'value_fit': 5
  };
  return priorityMap[category] || 999;
}

function HighlightedText({ text, highlights, filterCategory = 'all' }) {
  if (!highlights || highlights.length === 0) return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;

  // 필터링 적용
  let filteredHighlights = highlights;
  if (filterCategory && filterCategory !== 'all') {
    filteredHighlights = highlights.filter(highlight => {
      const categoryKey = getHighlightCategoryKey(highlight);
      return categoryKey === filterCategory;
    });
  }

  // 인덱스 기반 하이라이트 (start, end) + 카테고리별 색상 적용
  let lastIndex = 0;
  const elements = [];
  
  // 하이라이트를 위치 순서로 정렬하고 중복 제거
  const sortedHighlights = [...filteredHighlights]
    .sort((a, b) => a.start - b.start)
    .filter((highlight, index, array) => {
      // 같은 위치의 중복 하이라이트 제거
      if (index > 0) {
        const prev = array[index - 1];
        return !(highlight.start === prev.start && highlight.end === prev.end);
      }
      return true;
    });
  
  console.log('정렬된 하이라이트:', sortedHighlights.map(h => ({
    start: h.start,
    end: h.end,
    category: h.category,
    text: h.text || h.sentence
  })));
  
  sortedHighlights.forEach((highlight, idx) => {
    const { start, end } = highlight;
    const categoryKey = getHighlightCategoryKey(highlight);
    const catObj = HIGHLIGHT_CATEGORIES.find(c => c.key === categoryKey);
    
    // 시작 위치가 이전 하이라이트와 겹치는 경우 처리
    if (start < lastIndex) {
      console.warn(`하이라이트 겹침 감지: 현재 start=${start}, lastIndex=${lastIndex}`);
      return; // 겹치는 하이라이트는 건너뛰기
    }
    
    if (lastIndex < start) {
      // 원본 텍스트 포맷팅 보존
      const originalText = text.slice(lastIndex, start);
      elements.push(
        <span key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
          {originalText}
        </span>
      );
    }
    
    // 다중 카테고리 도트 표시 로직
    const isMultiple = highlight.multiple_categories && highlight.multiple_categories.length > 1;
    const categoryDots = highlight.category_dots || '';
    
    // 툴팁 텍스트 생성
    let tooltipText = categoryKey === 'experience' ? '성과/수상/프로젝트 경험/경력' : (catObj ? catObj.label : '');
    if (isMultiple) {
      const categoryLabels = highlight.multiple_categories.map(cat => 
        HIGHLIGHT_CATEGORIES.find(c => c.key === cat)?.label || cat
      ).join(' + ');
      tooltipText = `${categoryLabels} (${categoryDots})`;
    }
    
    // 감정 점수 추가 (오렌지색인 경우)
    if (categoryKey === 'negative_tone' && highlight.sentiment_score) {
      const sentimentPercent = Math.round(highlight.sentiment_score * 100);
      tooltipText += `\n감정 점수: ${sentimentPercent}% (부정)`;
    }
    
    // 일반 하이라이트 스타일
    const highlightStyle = {
      backgroundColor: catObj ? catObj.bg_color : '#FFD600',
      color: catObj && catObj.color ? catObj.color : '#222',  // 텍스트 색상을 배경색에 맞게 조정
      padding: '2px 4px',
      borderRadius: '3px',
      fontWeight: 600,
      opacity: 0.95,
      position: 'relative',
      display: 'inline-block',
      border: 'none',
      fontStyle: 'normal',
      whiteSpace: 'pre-wrap',
      fontFamily: 'inherit'
    };
    
    // 텍스트 색상을 배경색에 맞게 조정 (가독성 향상)
    if (catObj && catObj.bg_color) {
      // 밝은 배경색에는 어두운 텍스트, 어두운 배경색에는 밝은 텍스트
      const bgColor = catObj.bg_color;
      if (bgColor.includes('#fee2e2') || bgColor.includes('#fff3e0') || bgColor.includes('#fef9c3')) {
        // 밝은 배경색 (빨간색, 오렌지색, 노란색)
        highlightStyle.color = '#333';
      } else if (bgColor.includes('#EDE9FE') || bgColor.includes('#e0f2fe')) {
        // 중간 톤 배경색 (보라색, 파란색)
        highlightStyle.color = '#1a1a1a';
      } else {
        // 기본값
        highlightStyle.color = '#222';
      }
    }
    
    console.log(`하이라이팅 렌더링: category=${categoryKey}, color=${catObj?.color}, bg_color=${catObj?.bg_color}, text="${highlight.text || highlight.sentence}"`);
    
    elements.push(
      <span
        key={`highlight-${start}-${end}`}
        style={highlightStyle}
        title={tooltipText}
      >
        {text.slice(start, end)}
        {/* 다중 카테고리 도트 표시 */}
        {isMultiple && (
          <span
            style={{
              fontSize: '8px',
              marginLeft: '2px',
              verticalAlign: 'super',
              opacity: 0.8
            }}
          >
            {categoryDots}
          </span>
        )}
      </span>
    );
    lastIndex = end;
  });
  
  if (lastIndex < text.length) {
    // 마지막 부분도 원본 텍스트 포맷팅 보존
    const remainingText = text.slice(lastIndex);
    elements.push(
      <span key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
        {remainingText}
      </span>
    );
  }
  
  return <span style={{ whiteSpace: 'pre-wrap' }}>{elements}</span>;
}

export default HighlightedText;

// 🔄 우선순위 기반 하이라이팅 통계 컴포넌트
export function HighlightStats({ highlights = [], categories = {}, onFilterChange }) {
  // 입력 데이터 검증
  if (!Array.isArray(highlights) || highlights.length === 0) {
    console.log('HighlightStats: 하이라이트 데이터가 없습니다');
    return null;
  }
  
  // 중복 제거를 위한 Set 사용
  const uniqueHighlights = new Map(); // key: category_text, value: highlight
  
  highlights.forEach(h => {
    // 유효한 하이라이트 데이터인지 확인
    if (!h || (!h.text && !h.sentence) || !h.category) {
      return; // 건너뛰기
    }
    
    const key = getHighlightCategoryKey(h);
    const text = h.text || h.sentence || '';
    
    // 카테고리별로 고유한 키 생성
    let uniqueKey;
    if (key === 'skill_fit') {
      // 기술 매칭: 같은 스킬은 한 번만 카운팅 (대소문자 무시)
      uniqueKey = `${key}_${text.toLowerCase()}`;
    } else if (key === 'experience') {
      // 실제 경험: 같은 텍스트는 한 번만 카운팅
      uniqueKey = `${key}_${text}`;
    } else {
      // 기타: 카테고리 + 텍스트로 구분
      uniqueKey = `${key}_${text}`;
    }
    
    // 이미 존재하는 경우 우선순위가 높은 것만 유지
    if (!uniqueHighlights.has(uniqueKey) || 
        getPriority(h.category) < getPriority(uniqueHighlights.get(uniqueKey).category)) {
      uniqueHighlights.set(uniqueKey, h);
    }
  });
  
  // 중복 제거된 하이라이트로 통계 계산
  const stats = {};
  uniqueHighlights.forEach(h => {
    const key = getHighlightCategoryKey(h);
    stats[key] = (stats[key] || 0) + 1;
  });
  
  console.log('하이라이팅 통계 계산:', { 
    inputHighlights: highlights.length, 
    uniqueHighlights: uniqueHighlights.size, 
    stats 
  });
  
  // 🆕 우선순위 순서로 정렬 (빨간색→회색→보라색→파란색→노란색)
  const sortedCategories = HIGHLIGHT_CATEGORIES.sort((a, b) => a.priority - b.priority);
  
  return (
    <div className="highlight-stats p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <h4 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-300">
        하이라이팅 통계 (우선순위순)
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {sortedCategories.map(catDef => {
          const key = catDef.key;
          const count = stats[key] || 0;
          return (
            <div 
              key={key} 
              className="text-center cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded p-1 transition-colors"
              onClick={() => onFilterChange && onFilterChange(key)}
              title={`${catDef.label} 클릭하여 필터링`}
            >
              <div className="flex items-center justify-center mb-1">
                {/* 🆕 이모지 + 색상 박스 */}
                <span className="text-xs mr-1">{catDef.emoji}</span>
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: catDef.bg_color }}
                ></div>
              </div>
              <div className="text-xs font-medium" style={{ color: catDef.color }}>
                {count}
              </div>
              <div className="text-xs text-gray-500">{catDef.label}</div>
            </div>
          );
        })}
      </div>
      {/* 전체 보기 버튼 제거 - 필터 상태 바에서만 표시 */}
    </div>
  );
} 