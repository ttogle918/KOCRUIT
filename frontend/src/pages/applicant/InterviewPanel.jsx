import React from 'react';
import Rating from '@mui/material/Rating';

function InterviewPanel({ questions = [], memo = '', onMemoChange, evaluation = {}, onEvaluationChange, isAutoSaving = false }) {
  // 예시: 카테고리별 평가 항목(실제 항목 구조에 맞게 수정)
  const categories = [
    {
      name: '인성',
      items: ['예의', '성실성', '적극성']
    },
    {
      name: '역량',
      items: ['기술력', '문제해결', '커뮤니케이션']
    }
  ];

  // 평가 점수 입력 핸들러
  const handleScoreChange = (category, item, score) => {
    onEvaluationChange(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [item]: score
      }
    }));
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* 자동 저장 상태 표시 */}
      {isAutoSaving && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          자동 저장 중...
        </div>
      )}
      
      <div className="mb-2 font-bold text-lg">면접 질문</div>
      <ul className="mb-4 list-disc list-inside text-sm text-gray-700 dark:text-gray-200">
        {questions.map((q, i) => <li key={i}>{q}</li>)}
      </ul>
      <div className="mb-2 font-bold text-lg">평가 항목</div>
      <div className="flex flex-col gap-2">
        {categories.map(cat => (
          <div key={cat.name} className="mb-2">
            <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">{cat.name}</div>
            {cat.items.map(item => (
              <div key={item} className="flex items-center gap-2 mb-1">
                <span className="w-24 text-sm">{item}</span>
                <Rating
                  name={`${cat.name}-${item}`}
                  value={evaluation[cat.name]?.[item] || 0}
                  onChange={(event, newValue) => handleScoreChange(cat.name, item, newValue)}
                  max={5}
                  size="medium"
                  disabled={isAutoSaving}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">평가</h3>
        <table className="w-full text-center border border-gray-300 dark:border-gray-600">
          <thead>
            <tr>
              <th className="p-1 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">항목</th>
              <th className="p-1 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">상</th>
              <th className="p-1 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">중</th>
              <th className="p-1 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">하</th>
            </tr>
          </thead>
          <tbody>
            {['인성', '역량'].map((item) => (
              <tr key={item}>
                <td className="p-1 border border-gray-300 dark:border-gray-600 w-1/4 text-gray-900 dark:text-gray-100">{item}</td>
                {['상', '중', '하'].map((level) => (
                  <td key={level} className="p-1 border border-gray-300 dark:border-gray-600">
                    <input
                      type="radio"
                      name={item}
                      value={level}
                      checked={evaluation[item] === level}
                      onChange={() => onEvaluationChange(item, level)}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <div className="font-semibold mb-1">면접 메모</div>
        <textarea
          className={`w-full min-h-[80px] p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
            isAutoSaving ? 'opacity-75' : ''
          }`}
          value={memo}
          onChange={e => onMemoChange(e.target.value)}
          placeholder="면접 중 느낀 점, 특이사항 등을 기록하세요"
          disabled={isAutoSaving}
        />
      </div>
    </div>
  );
}

export default InterviewPanel;