import React from 'react';

const InterviewStageReport = ({ stage, evaluationData }) => {
  if (!stage) return null;

  // 면접 단계 여부 확인
  const isInterview = ["AI_INTERVIEW", "PRACTICAL_INTERVIEW", "EXECUTIVE_INTERVIEW"].includes(stage.stage_name);

  return (
    <div className="mt-4 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
        <h4 className="text-lg font-bold text-gray-800">{stage.stage_name} 상세 리포트</h4>
        <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
          획득 점수: {stage.score || evaluationData?.overall_score || '-'}점
        </div>
      </div>

      {/* 1. 판정 사유 섹션 */}
      <div className="mb-6">
        <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">종합 평가 사유</h5>
        <div className="p-4 bg-gray-50 rounded-lg text-gray-700 text-sm leading-relaxed border-l-4 border-blue-500">
          {stage.reason || evaluationData?.comments || "기록된 상세 사유가 없습니다."}
        </div>
      </div>

      {/* 2. 면접 전형 전용 상세 섹션 (STT / AI 분석) */}
      {isInterview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* AI 역량 분석 */}
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-purple-600 uppercase tracking-wider">AI 역량 분석 요약</h5>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-900 italic">
                {evaluationData?.ai_analysis_summary || "분석된 역량 데이터가 존재하지 않습니다."}
              </p>
            </div>
          </div>

          {/* 주요 답변 키워드 */}
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-green-600 uppercase tracking-wider">핵심 키워드 (STT)</h5>
            <div className="flex flex-wrap gap-2">
              {(evaluationData?.keywords || ["React", "협업", "문제해결", "성실함"]).map((kw, idx) => (
                <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-medium">
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewStageReport;