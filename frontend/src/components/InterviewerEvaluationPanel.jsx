import React, { useState } from 'react';
import { MdOutlineMic, MdOutlineMicOff, MdOutlineSave, MdOutlineStar } from 'react-icons/md';

export default function InterviewerEvaluationPanel({ 
  selectedApplicant, 
  onEvaluationSubmit,
  isConnected = false 
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

  const handleScoreChange = (field, value) => {
    const newEvaluation = { ...evaluation, [field]: value };
    
    // 전체 점수 자동 계산
    const totalScore = (
      newEvaluation.technicalScore + 
      newEvaluation.communicationScore + 
      newEvaluation.problemSolvingScore + 
      newEvaluation.cultureFitScore
    ) / 4;
    
    newEvaluation.overallScore = Math.round(totalScore * 10) / 10;
    setEvaluation(newEvaluation);
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

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            면접관 평가 패널
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
      </div>

      {/* 평가 내용 */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* 점수 평가 */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">점수 평가</h3>
          
          {[
            { key: 'technicalScore', label: '기술 역량', description: '전문 지식과 기술적 능력' },
            { key: 'communicationScore', label: '의사소통', description: '명확한 의사전달과 소통 능력' },
            { key: 'problemSolvingScore', label: '문제해결', description: '문제 분석 및 해결 능력' },
            { key: 'cultureFitScore', label: '문화적합성', description: '조직 문화 적합도' }
          ].map(({ key, label, description }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {evaluation[key]}/5
                </div>
              </div>
              <div className="flex space-x-1">
                {scoreOptions.map((score) => (
                  <button
                    key={score}
                    onClick={() => handleScoreChange(key, score)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      evaluation[key] >= score
                        ? 'bg-yellow-400 text-yellow-900'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <MdOutlineStar size={16} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* 전체 점수 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 dark:text-gray-100">전체 점수</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {evaluation.overallScore}/5
              </div>
            </div>
          </div>
        </div>

        {/* 상세 평가 */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">상세 평가</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                강점
              </label>
              <textarea
                value={evaluation.strengths}
                onChange={(e) => setEvaluation({...evaluation, strengths: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                rows={3}
                placeholder="지원자의 주요 강점을 작성하세요..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                개선점
              </label>
              <textarea
                value={evaluation.weaknesses}
                onChange={(e) => setEvaluation({...evaluation, weaknesses: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                rows={3}
                placeholder="개선이 필요한 부분을 작성하세요..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                추가 메모
              </label>
              <textarea
                value={evaluation.notes}
                onChange={(e) => setEvaluation({...evaluation, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                rows={4}
                placeholder="면접 중 특이사항이나 추가 메모를 작성하세요..."
              />
            </div>
          </div>
        </div>

        {/* 최종 추천 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">최종 추천</h3>
          <div className="flex space-x-3">
            {[
              { value: 'pass', label: '합격', color: 'bg-green-500 hover:bg-green-600' },
              { value: 'hold', label: '보류', color: 'bg-yellow-500 hover:bg-yellow-600' },
              { value: 'fail', label: '불합격', color: 'bg-red-500 hover:bg-red-600' }
            ].map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => setEvaluation({...evaluation, recommendation: value})}
                className={`flex-1 py-2 px-4 rounded-md text-white font-medium transition-colors ${
                  evaluation.recommendation === value ? color : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
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
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            {isRecording ? <MdOutlineMicOff size={16} /> : <MdOutlineMic size={16} />}
            <span>{isRecording ? '녹음 중지' : '녹음 시작'}</span>
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={!selectedApplicant}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            <MdOutlineSave size={16} />
            <span>평가 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
} 