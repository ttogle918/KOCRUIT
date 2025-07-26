import React from "react";

// highlights: [{ start: number, end: number }] 또는 하이라이트할 단어 배열 등 다양한 방식 지원 가능
// 🔄 우선순위 기반 하이라이트 카테고리 상수 정의 (빨간색→회색→보라색→파란색→노란색)
export const HIGHLIGHT_CATEGORIES = [
  { key: 'risk', label: '주의 표현', color: '#E53935', bg_color: '#fee2e2', description: '가치·직무와 충돌 or 부정적 태도', priority: 1, emoji: '❤️' },
  { key: 'vague', label: '추상 표현', color: '#222', bg_color: '#d1d5db', description: '근거 없는 추상 표현', priority: 2, emoji: '🩶' },
  { key: 'experience', label: '성과/수상/경험/경력', color: '#8B5CF6', bg_color: '#EDE9FE', description: '실제 수행한 경험/프로젝트/활동', priority: 3, emoji: '💜' },
  { key: 'skill_fit', label: '기술 매칭', color: '#1976D2', bg_color: '#e0f2fe', description: 'JD 핵심 기술과 직접 매칭', priority: 4, emoji: '💙' },
  { key: 'value_fit', label: '인재상 매칭', color: '#ff9800', bg_color: '#fef9c3', description: '회사 인재상 키워드와 직접 매칭', priority: 5, emoji: '💛' }
];

// experience 하이라이트를 sub_label별로 분리
function getHighlightCategoryKey(highlight) {
  if (highlight.category === 'experience') return 'experience';
  return highlight.category;
}

// 우선순위 가져오기 헬퍼 함수
function getPriority(category) {
  const priorityMap = {
    'risk': 1,
    'vague': 2,
    'experience': 3,
    'skill_fit': 4,
    'value_fit': 5
  };
  return priorityMap[category] || 999;
}

// 🆕 전환어 패턴 확인 함수
function isTransitionWord(text) {
  const transitionPatterns = [
    /하지만|그럼에도\s*불구하고|그러나|다만|단|오히려|반면|반대로|대신|대신에/,
    /그러다가|그\s*후|이후|그\s*다음|다음에는|그\s*때부터/,
    /만약|만약에|결과적으로|결국|마침내|드디어/,
    /또한|게다가|더욱이|무엇보다|특히|특별히/
  ];
  
  return transitionPatterns.some(pattern => pattern.test(text));
}

function HighlightedText({ text, highlights }) {
  if (!highlights || highlights.length === 0) return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;

  // 인덱스 기반 하이라이트 (start, end) + 카테고리별 색상 적용
  let lastIndex = 0;
  const elements = [];
  
  // 🆕 하이라이트를 위치 순서로 정렬하고 중복 제거
  const sortedHighlights = [...highlights]
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
    
    // 🆕 다중 카테고리 도트 표시 로직
    const isMultiple = highlight.multiple_categories && highlight.multiple_categories.length > 1;
    const categoryDots = highlight.category_dots || '';
    
    // 🆕 전환어 여부 확인
    const highlightText = highlight.text || highlight.sentence || '';
    const isTransition = isTransitionWord(highlightText);
    
    // 툴팁 텍스트 생성
    let tooltipText = categoryKey === 'experience' ? '성과/수상/프로젝트 경험/경력' : (catObj ? catObj.label : '');
    if (isMultiple) {
      const categoryLabels = highlight.multiple_categories.map(cat => 
        HIGHLIGHT_CATEGORIES.find(c => c.key === cat)?.label || cat
      ).join(' + ');
      tooltipText = `${categoryLabels} (${categoryDots})`;
    }
    
    // 🆕 전환어인 경우 스타일 조정
    const highlightStyle = {
      backgroundColor: catObj ? catObj.bg_color : '#FFD600',
      color: catObj ? catObj.color : '#222',
      padding: '2px 4px',
      borderRadius: '3px',
      fontWeight: isTransition ? 400 : 600, // 전환어는 얇게
      opacity: isTransition ? 0.8 : 0.95, // 투명도 개선: 전환어 0.8, 일반 0.95
      position: 'relative',
      display: 'inline-block',
      border: isTransition ? '1px dashed #ccc' : 'none', // 전환어는 점선 테두리
      fontStyle: isTransition ? 'italic' : 'normal', // 전환어는 이탤릭
      whiteSpace: 'pre-wrap', // 원본 텍스트 포맷팅 보존
      fontFamily: 'inherit' // 부모 요소의 글씨체 상속
    };
    
    console.log(`하이라이팅 렌더링: category=${categoryKey}, color=${catObj?.color}, bg_color=${catObj?.bg_color}, text="${highlightText}"`);
    
    elements.push(
      <span
        key={`highlight-${start}-${end}`}
        style={highlightStyle}
        title={tooltipText}
      >
        {text.slice(start, end)}
        {/* 🆕 다중 카테고리 도트 표시 */}
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
        {/* 🆕 전환어 표시 */}
        {isTransition && (
          <span
            style={{
              fontSize: '8px',
              marginLeft: '2px',
              verticalAlign: 'super',
              opacity: 0.6,
              color: '#666'
            }}
          >
            🔄
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
export function HighlightStats({ highlights = [], categories = {} }) {
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
            <div key={key} className="text-center">
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
    </div>
  );
} 