import React, { useState } from 'react';
import Rating from '@mui/material/Rating';
import api from '../../api/api';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ApplicantCard from '../../components/ApplicantCard';
import AudioPlayer from '../../components/AudioPlayer';
import { FiMic, FiMicOff } from 'react-icons/fi';


function InterviewPanel({
  questions = [],
  memo = '',
  onMemoChange,
  evaluation = {},
  onEvaluationChange,
  isAutoSaving = false,
  resumeId,
  applicationId,
  companyName,
  applicantName,
  interviewChecklist = null,
  strengthsWeaknesses = null,
  interviewGuideline = null,
  evaluationCriteria = null,
  toolsLoading = false,
  audioFile = null, // 추가: 오디오 파일 경로
  jobInfo = null, // 추가: 채용공고 정보
  resumeInfo = null // 추가: 이력서 정보
}) {
  // 면접관 지원 도구 상태 제거 (useState, useEffect, loadInterviewTools 등 모두 삭제)
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'analysis', 'checklist', 'guideline', 'criteria'
  const [aiMemo, setAiMemo] = useState(''); // 추가: AI 자동 메모
  const [isRecording, setIsRecording] = useState(false); // 녹음 상태

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

  // AI 평가 결과 처리 핸들러
  const handleEvaluationUpdate = (evaluationResult) => {
    if (evaluationResult.auto_memo) {
      setAiMemo(prev => prev + '\n' + evaluationResult.auto_memo);
    }
  };

  // 음성 인식 결과 처리 핸들러
  const handleTranscriptionUpdate = (transcriptionResult) => {
    console.log('음성 인식 결과:', transcriptionResult);
    // 필요시 추가 처리
  };

  // 녹음 시작/중지 핸들러
  const handleRecordingToggle = () => {
    setIsRecording(!isRecording);
    // TODO: 실제 녹음 기능 구현
    console.log('녹음 상태:', !isRecording ? '시작' : '중지');
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
      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-300 dark:border-gray-600">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'questions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('questions')}
        >
          면접 질문
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'analysis' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('analysis')}
        >
          AI 분석
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'checklist' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('checklist')}
        >
          체크리스트
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'guideline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('guideline')}
        >
          가이드라인
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'criteria' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('criteria')}
        >
          평가 기준
        </button>
      </div>
      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'questions' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 질문</div>
            <ul className="mb-4 list-disc list-inside text-sm text-gray-700 dark:text-gray-200">
              {questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </div>
        )}
        {activeTab === 'analysis' && (
          <div>
            <div className="mb-2 font-bold text-lg">AI 분석</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">AI 분석 중...</span>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {strengthsWeaknesses && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight="bold">강점 및 약점</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <div className="whitespace-pre-wrap text-sm">
                        {strengthsWeaknesses}
                      </div>
                    </AccordionDetails>
                  </Accordion>
                )}

                {interviewGuideline && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight="bold">면접 가이드라인</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <div className="whitespace-pre-wrap text-sm">
                        {interviewGuideline}
                      </div>
                    </AccordionDetails>
                  </Accordion>
                )}

                {evaluationCriteria && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight="bold">평가 기준</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <div className="space-y-4 text-sm">
                        {typeof evaluationCriteria === 'object' ? (
                          <div>
                            {evaluationCriteria.suggested_criteria && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">제안 평가 기준</h4>
                                {evaluationCriteria.suggested_criteria.map((criteria, i) => (
                                  <div key={i} className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <div className="font-medium">{criteria.criterion}</div>
                                    <div className="text-gray-600 dark:text-gray-400">{criteria.description}</div>
                                    <div className="text-xs text-gray-500">최대 점수: {criteria.max_score}점</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {evaluationCriteria.weight_recommendations && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">가중치 권장사항</h4>
                                {evaluationCriteria.weight_recommendations.map((weight, i) => (
                                  <div key={i} className="mb-1">
                                    <span className="font-medium">{weight.criterion}:</span>
                                    <span className="ml-2">{(weight.weight * 100).toFixed(0)}%</span>
                                    <div className="text-xs text-gray-500 ml-4">{weight.reason}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {evaluationCriteria.evaluation_questions && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">평가 질문</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {evaluationCriteria.evaluation_questions.map((question, i) => (
                                    <li key={i} className="text-gray-700 dark:text-gray-300">{question}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {evaluationCriteria.scoring_guidelines && (
                              <div>
                                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">채점 가이드라인</h4>
                                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                  {evaluationCriteria.scoring_guidelines}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {evaluationCriteria}
                          </div>
                        )}
                      </div>
                    </AccordionDetails>
                  </Accordion>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'checklist' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 체크리스트</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">체크리스트 로딩 중...</span>
              </div>
            ) : interviewChecklist ? (
              <div className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {interviewChecklist || '체크리스트가 없습니다.'}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">체크리스트를 생성할 수 없습니다.</div>
            )}
          </div>
        )}
        {activeTab === 'guideline' && (
          <div>
            <div className="mb-2 font-bold text-lg">면접 가이드라인</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">가이드라인 로딩 중...</span>
              </div>
            ) : interviewGuideline ? (
              <div className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {interviewGuideline || '가이드라인이 없습니다.'}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">가이드라인을 생성할 수 없습니다.</div>
            )}
          </div>
        )}
        {activeTab === 'criteria' && (
          <div>
            <div className="mb-2 font-bold text-lg">평가 기준</div>
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">평가 기준 로딩 중...</span>
              </div>
            ) : evaluationCriteria ? (
              <div className="space-y-4 text-sm">
                {typeof evaluationCriteria === 'object' ? (
                  <div>
                    {evaluationCriteria.suggested_criteria && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">제안 평가 기준</h4>
                        {evaluationCriteria.suggested_criteria.map((criteria, i) => (
                          <div key={i} className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="font-medium">{criteria.criterion}</div>
                            <div className="text-gray-600 dark:text-gray-400">{criteria.description}</div>
                            <div className="text-xs text-gray-500">최대 점수: {criteria.max_score}점</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {evaluationCriteria.weight_recommendations && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">가중치 권장사항</h4>
                        {evaluationCriteria.weight_recommendations.map((weight, i) => (
                          <div key={i} className="mb-1">
                            <span className="font-medium">{weight.criterion}:</span>
                            <span className="ml-2">{(weight.weight * 100).toFixed(0)}%</span>
                            <div className="text-xs text-gray-500 ml-4">{weight.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {evaluationCriteria.evaluation_questions && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">평가 질문</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {evaluationCriteria.evaluation_questions.map((question, i) => (
                            <li key={i} className="text-gray-700 dark:text-gray-300">{question}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evaluationCriteria.scoring_guidelines && (
                      <div>
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">채점 가이드라인</h4>
                        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {evaluationCriteria.scoring_guidelines}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    {evaluationCriteria || '평가 기준이 없습니다.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">평가 기준을 생성할 수 없습니다.</div>
            )}
          </div>
        )}
      </div>
      {/* 오디오 플레이어 (면접 녹음이 있는 경우) */}
      {audioFile && (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
          <div className="relative">
            {/* 녹음 버튼 - 상단 우측 */}
            <button
              onClick={handleRecordingToggle}
              className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
              }`}
              title={isRecording ? '녹음 중지' : '녹음 시작'}
            >
              {isRecording ? <FiMicOff size={16} /> : <FiMic size={16} />}
            </button>
            <AudioPlayer
              audioFile={audioFile}
              onTranscriptionUpdate={handleTranscriptionUpdate}
              onEvaluationUpdate={handleEvaluationUpdate}
              jobInfo={jobInfo}
              resumeInfo={resumeInfo}
              isRealtimeEvaluation={true}
            />
          </div>
        </div>
      )}
      {/* 평가 항목 (항상 표시) */}
      <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
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
      </div>
      {/* 메모 입력 */}
      <div>
        <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">면접 메모</h3>
        <textarea
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
          className="w-full h-24 p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm"
          placeholder="면접 중 메모를 입력하세요..."
          disabled={isAutoSaving}
        />
        
        {/* AI 자동 메모 표시 */}
        {aiMemo && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-80">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">AI 자동 메모:</div>
            <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {aiMemo}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewPanel;