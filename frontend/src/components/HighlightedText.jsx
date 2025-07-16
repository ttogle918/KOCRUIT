import React from "react";

// highlights: [{ start: number, end: number }] 또는 하이라이트할 단어 배열 등 다양한 방식 지원 가능
function HighlightedText({ text, highlights }) {
  if (!highlights || highlights.length === 0) return <span>{text}</span>;

  // MVP: 하이라이트할 단어 배열 방식 예시
  if (typeof highlights[0] === "string") {
    let parts = [text];
    highlights.forEach((word) => {
      parts = parts.flatMap((part) =>
        typeof part === "string"
          ? part.split(new RegExp(`(${word})`, "gi")).map((chunk, i) =>
              chunk.toLowerCase() === word.toLowerCase() ? (
                <mark key={word + i}>{chunk}</mark>
              ) : (
                chunk
              )
            )
          : part
      );
    });
    return <span>{parts}</span>;
  }

  // 인덱스 기반 하이라이트 (start, end) + 카테고리별 색상 적용
  let lastIndex = 0;
  const elements = [];
  highlights.forEach((highlight, idx) => {
    const { start, end, category } = highlight;
    if (lastIndex < start) {
      elements.push(<span key={lastIndex}>{text.slice(lastIndex, start)}</span>);
    }
    const catObj = HIGHLIGHT_CATEGORIES.find(c => c.key === category);
    elements.push(
      <span
        key={start + '-' + end}
        style={{
          backgroundColor: catObj ? catObj.color : '#FFD600',
          color: '#fff',
          padding: '2px 4px',
          borderRadius: '3px',
          fontWeight: 500
        }}
        title={catObj ? catObj.label : category}
      >
        {text.slice(start, end)}
      </span>
    );
    lastIndex = end;
  });
  if (lastIndex < text.length) {
    elements.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }
  return <span>{elements}</span>;
}

export default HighlightedText;

// 하이라이트 카테고리 상수 정의 (실제 평가 기준에 맞게 수정)
export const HIGHLIGHT_CATEGORIES = [
  { key: 'impact', label: '정량 성과', color: '#43A047', description: '숫자·퍼센트 등 정량 성과' },
  { key: 'skill_fit', label: '기술 매칭', color: '#1976D2', description: 'JD 핵심 기술과 직접 매칭' },
  { key: 'value_fit', label: '인재상 매칭', color: '#FFD600', description: '회사 인재상 키워드와 직접 매칭' },
  { key: 'vague', label: '추상 표현', color: '#FFA000', description: '근거 없는 추상 표현' },
  { key: 'risk', label: '위험/부정적', color: '#E53935', description: '가치·직무와 충돌 or 부정적 태도' }
];

// 하이라이팅 통계 컴포넌트
export function HighlightStats({ highlights = [] }) {
  console.log('하이라이트 전체:', highlights);
  const stats = highlights.reduce((acc, highlight) => {
    acc[highlight.category] = (acc[highlight.category] || 0) + 1;
    return acc;
  }, {});
  console.log('카테고리별 통계:', stats);

  return (
    <div className="highlight-stats p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <h4 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-300">
        하이라이팅 통계
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {HIGHLIGHT_CATEGORIES.map(category => (
          <div key={category.key} className="text-center">
            <div
              className="w-4 h-4 mx-auto mb-1 rounded-sm"
              style={{ backgroundColor: category.color }}
            ></div>
            <div className="text-xs font-medium" style={{ color: category.color }}>
              {stats[category.key] || 0}
            </div>
            <div className="text-xs text-gray-500">{category.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 