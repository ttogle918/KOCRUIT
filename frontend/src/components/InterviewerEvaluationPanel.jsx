import React, { useState } from 'react';
import { MdOutlineMic, MdOutlineMicOff, MdOutlineSave, MdOutlineStar } from 'react-icons/md';

export default function InterviewerEvaluationPanel({ 
  selectedApplicant, 
  onEvaluationSubmit,
  isConnected = false,
  jobBasedEvaluationCriteria = null, // 공고 기반 평가항목 추가
  evaluationScores = {}, // 평가 점수 상태
  onEvaluationScoreChange = null, // 점수 변경 핸들러
  evaluationTotalScore = 0 // 총점
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [evaluation, setEvaluation] = useState({
    technicalScore: 0,
    communicationScore: 0,
    problemSolvingScore: 0,
    cultureFitScore: 0,
    overallScore: 0,
    notes: '',
    strengths: '',
    weaknesses: '',
    recommendation: 'pass' // pass, fail, hold
  });

  // 공고 기반 평가항목이 있으면 동적으로 평가 항목 생성
  const getEvaluationItems = () => {
    if (jobBasedEvaluationCriteria?.suggested_criteria) {
      return jobBasedEvaluationCriteria.suggested_criteria.map((criterion, index) => ({
        key: `criterion_${index}`,
        label: criterion.criterion,
        description: criterion.description,
        maxScore: criterion.max_score || 5
      }));
    }
    
    // 기본 평가 항목 (공고 기반 평가항목이 없을 때)
    return [
      { key: 'technicalScore', label: '기술 역량', description: '전문 지식과 기술적 능력', maxScore: 5 },
      { key: 'communicationScore', label: '의사소통', description: '명확한 의사전달과 소통 능력', maxScore: 5 },
      { key: 'problemSolvingScore', label: '문제해결', description: '문제 분석 및 해결 능력', maxScore: 5 },
      { key: 'cultureFitScore', label: '문화적합성', description: '조직 문화 적합도', maxScore: 5 }
    ];
  };

  const handleScoreChange = (field, value) => {
    const newEvaluation = { ...evaluation, [field]: value };
    
    // 전체 점수 자동 계산
    const evaluationItems = getEvaluationItems();
    const totalScore = evaluationItems.reduce((sum, item) => {
      return sum + (newEvaluation[item.key] || 0);
    }, 0) / evaluationItems.length;
    
    newEvaluation.overallScore = Math.round(totalScore * 10) / 10;
    setEvaluation(newEvaluation);
  };

  // 공고 기반 평가항목 점수 변경 핸들러
  const handleCriterionScoreChange = (criterionKey, score) => {
    if (onEvaluationScoreChange) {
      onEvaluationScoreChange(criterionKey, score);
    }
  };

  const handleSubmit = () => {
    if (onEvaluationSubmit) {
      onEvaluationSubmit({
        applicantId: selectedApplicant?.id,
        ...evaluation,
        timestamp: new Date().toISOString()
      });
    }
  };

  const scoreOptions = [1, 2, 3, 4, 5];
  const evaluationItems = getEvaluationItems();

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            면접관 평가 패널
            {jobBasedEvaluationCriteria && (
              <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                (공고 맞춤형)
              </span>
            )}
          </h2>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
              isConnected 
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' 
                : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isConnected ? '연결됨' : '연결 안됨'}</span>
            </div>
          </div>
        </div>
        
        {selectedApplicant && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            평가 대상: <span className="font-semibold">{selectedApplicant.name}</span>
          </div>
        )}

        {/* 총점 표시 */}
        {jobBasedEvaluationCriteria && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">총점:</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {evaluationTotalScore.toFixed(1)}/5.0
            </span>
          </div>
        )}
      </div>

      {/* 평가 내용 */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* 점수 평가 */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">점수 평가</h3>
          
          {evaluationItems.map(({ key, label, description, maxScore }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {jobBasedEvaluationCriteria ? 
                    (evaluationScores[key] || 0) : 
                    (evaluation[key] || 0)
                  }/{maxScore}
                </div>
              </div>
              
              {/* 별표 채점 UI */}
              <div className="flex space-x-1">
                {Array.from({ length: maxScore }, (_, i) => i + 1).map((score) => {
                  const currentScore = jobBasedEvaluationCriteria ? 
                    (evaluationScores[key] || 0) : 
                    (evaluation[key] || 0);
                  
                  return (
                    <button
                      key={score}
                      onClick={() => {
                        if (jobBasedEvaluationCriteria) {
                          handleCriterionScoreChange(key, score);
                        } else {
                          handleScoreChange(key, score);
                        }
                      }}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-colors ${
                        currentScore >= score
                          ? 'bg-yellow-400 text-yellow-900'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <MdOutlineStar size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 코멘트 섹션 */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">평가 코멘트</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                강점
              </label>
              <textarea
                value={evaluation.strengths}
                onChange={(e) => setEvaluation(prev => ({ ...prev, strengths: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                rows={3}
                placeholder="지원자의 강점을 입력하세요..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                개선점
              </label>
              <textarea
                value={evaluation.weaknesses}
                onChange={(e) => setEvaluation(prev => ({ ...prev, weaknesses: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                rows={3}
                placeholder="개선이 필요한 부분을 입력하세요..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                종합 코멘트
              </label>
              <textarea
                value={evaluation.notes}
                onChange={(e) => setEvaluation(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                rows={3}
                placeholder="종합적인 평가 의견을 입력하세요..."
              />
            </div>
          </div>
        </div>

        {/* 합격 여부 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">합격 여부</h3>
          <div className="flex space-x-3">
            {[
              { value: 'pass', label: '합격', color: 'bg-green-500 hover:bg-green-600' },
              { value: 'hold', label: '보류', color: 'bg-yellow-500 hover:bg-yellow-600' },
              { value: 'fail', label: '불합격', color: 'bg-red-500 hover:bg-red-600' }
            ].map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => setEvaluation(prev => ({ ...prev, recommendation: value }))}
                className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                  evaluation.recommendation === value ? color : 'bg-gray-400 hover:bg-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 액션 버튼 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {isRecording ? <MdOutlineMicOff size={20} /> : <MdOutlineMic size={20} />}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRecording ? '녹음 중...' : '녹음 시작'}
            </span>
          </div>
          
          <button
            onClick={handleSubmit}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <MdOutlineSave size={16} />
            <span>평가 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
} 