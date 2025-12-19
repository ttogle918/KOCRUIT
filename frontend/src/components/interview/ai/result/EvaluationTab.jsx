import React from 'react';
import { MdOutlineAutoAwesome } from 'react-icons/md';
import { FiUser, FiTarget } from 'react-icons/fi';

/**
 * AI 심층 평가 / 면접관 평가 탭 컴포넌트
 */
const EvaluationTab = ({ 
  currentStage, 
  aiEvaluation, 
  humanEvaluation 
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 상단 스코어 요약 */}
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
              {currentStage === 'ai' ? <MdOutlineAutoAwesome /> : <FiUser />}
              {currentStage === 'ai' ? 'AI 심층 평가 리포트' : 
               currentStage === 'practice' ? '실무진 면접 평가 결과' : '임원진 면접 평가 결과'}
            </h3>
            <p className="text-blue-200 font-medium opacity-80">
              {currentStage === 'ai' ? '알고리즘 기반의 정밀 역량 분석 결과입니다.' : '면접관의 주관적 평가와 항목별 점수 요약입니다.'}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Total Average</p>
              <p className="text-4xl font-black">
                {currentStage === 'ai' ? (aiEvaluation?.total_score || '4.2') : (humanEvaluation?.total_score || '92')}
              </p>
            </div>
            <div className="h-10 w-px bg-white/20"></div>
            <div className="px-3 py-1 bg-blue-500 text-white rounded-lg font-black text-xl uppercase italic">
              {currentStage === 'ai' ? (aiEvaluation?.total_score >= 4 ? 'A+' : aiEvaluation?.total_score >= 3 ? 'B' : 'C') : 
               (humanEvaluation?.total_score >= 4 ? 'PASS' : 'HOLD')}
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32"></div>
      </div>

      {/* 상세 항목 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(currentStage === 'ai' ? aiEvaluation?.evaluation_items : humanEvaluation?.evaluation_items)?.map((item, idx) => (
          <div key={item.id || idx} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  <h4 className="text-sm font-black text-gray-500 uppercase tracking-wider">{item.evaluate_type}</h4>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900">{item.evaluate_score}</span>
                  <span className="text-xs font-bold text-gray-400">/ 5.0</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-black ${
                    item.grade === '상' || item.grade === 'A' ? 'bg-green-100 text-green-700' :
                    item.grade === '중' || item.grade === 'B' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{item.grade}등급</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed font-medium group-hover:bg-blue-50/50 transition-colors">
              {(() => {
                try {
                  const comment = typeof item.comment === 'string' && (item.comment.startsWith('[') || item.comment.startsWith('{'))
                    ? JSON.parse(item.comment) 
                    : item.comment;
                  
                  if (Array.isArray(comment)) {
                    return (
                      <div className="space-y-1">
                        {comment.map((msg, i) => (
                          <p key={i} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{msg}</span>
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return comment || '평가 의견이 없습니다.';
                } catch (e) {
                  return item.comment || '평가 의견이 없습니다.';
                }
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* 종합 의견 */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-8">
        <h4 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2">
          <FiTarget />
          전형 종합 의견
        </h4>
        <div className="text-gray-700 leading-relaxed font-medium text-lg italic">
          {(() => {
            const summary = currentStage === 'ai' ? aiEvaluation?.summary : humanEvaluation?.summary;
            if (!summary) return "종합 평가 내용이 없습니다.";
            
            try {
              const parsed = typeof summary === 'string' && (summary.startsWith('[') || summary.startsWith('{'))
                ? JSON.parse(summary) 
                : summary;
              
              if (Array.isArray(parsed)) {
                return (
                  <div className="space-y-2">
                    {parsed.map((msg, i) => (
                      <p key={i}>"{msg}"</p>
                    ))}
                  </div>
                );
              }
              return `"${parsed}"`;
            } catch (e) {
              return `"${summary}"`;
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default EvaluationTab;

