import React from 'react';
import { FaBrain, FaSmile } from 'react-icons/fa';
import { FiTarget, FiUser } from 'react-icons/fi';
import { 
  MdOutlineVolumeUp, MdOutlineAutoAwesome, 
  MdOutlineAnalytics, MdOutlineVideoLibrary,
  MdOutlineRecordVoiceOver
} from 'react-icons/md';
import MetricBox from './MetricBox';
import QuestionVideoAnalysisApi from '../../../../api/questionVideoAnalysisApi';

/**
 * 분석 리포트 탭 컴포넌트
 */
const AnalysisTab = ({ 
  currentStage, 
  interviewData, 
  aiEvaluation, 
  humanEvaluation,
  questionAnalysis, 
  loadInterviewData, 
  applicant,
  setShowQuestionAnalysisModal,
  setActiveTab,
  setShowDetailedWhisperAnalysis,
  openStt,
  setOpenStt,
  openWhisper,
  setOpenWhisper,
  openQuestion,
  setOpenQuestion,
  openQa,
  setOpenQa
}) => {
  // 현재 단계에 맞는 평가 데이터 선택 (DB 데이터 우선)
  const currentEval = currentStage === 'ai' ? aiEvaluation : humanEvaluation;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 상단 요약 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Total Score</p>
            <div className="text-3xl font-black mb-1">
              {currentEval?.total_score || (currentStage === 'ai' ? (interviewData?.videoAnalysis?.overall_score || interviewData?.whisperAnalysis?.analysis?.score) : 'N/A')}
              <span className="text-sm font-normal opacity-60 ml-1">/ 5.0</span>
            </div>
            <p className="text-xs font-medium">전형 종합 점수</p>
          </div>
          <FaBrain className="absolute -bottom-2 -right-2 text-6xl opacity-10 rotate-12" />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg">
              <MdOutlineVolumeUp />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">발화 속도</span>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {interviewData?.videoAnalysis?.speech_rate || interviewData?.whisperAnalysis?.analysis?.speaking_speed_wpm || 0} wpm
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-lg">
              <MdOutlineAnalytics />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">침묵 비율</span>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {((interviewData?.videoAnalysis?.silence_ratio || interviewData?.whisperAnalysis?.analysis?.silence_ratio || 0) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg text-lg">
              <FaSmile />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">감정 상태</span>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {interviewData?.videoAnalysis?.emotion || interviewData?.whisperAnalysis?.analysis?.emotion || '안정'}
          </div>
        </div>
      </div>
      
      {/* 전형 종합 평가 (AI 또는 면접관 평가 결과) */}
      {currentEval && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-black text-blue-900 flex items-center gap-2 text-lg">
              <MdOutlineAutoAwesome className="text-blue-600" />
              {currentStage === 'ai' ? 'AI' : (currentStage === 'practice' ? '실무진' : '임원진')} 전형 종합 평가
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-white px-3 py-1 rounded-full border border-blue-100">
                TOTAL SCORE: {currentEval.total_score}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {['상', '중', '하'].map(grade => {
              // DB의 evaluation_items 리스트에서 등급별 카운트 계산
              const count = (currentEval.evaluation_items || currentEval.evaluations?.[0]?.evaluation_items)?.filter(item => item.grade === grade).length || 0;
              return (
                <div key={grade} className="bg-white p-4 rounded-2xl text-center shadow-sm border border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">{grade} 등급</p>
                  <p className={`text-2xl font-black ${
                    grade === '상' ? 'text-emerald-600' : grade === '중' ? 'text-amber-600' : 'text-rose-600'
                  }`}>{count}</p>
                </div>
              );
            })}
          </div>
          {currentEval.summary && (
            <div className="bg-white/50 rounded-xl p-4 border border-blue-50">
              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                {currentEval.summary}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* 질문별 상세 리포트 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FiTarget className="text-blue-600" />
            질문별 상세 분석 리포트
          </h3>
          <span className="text-xs font-bold text-gray-400">총 {questionAnalysis.length}개 질문</span>
        </div>

        {questionAnalysis.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {questionAnalysis.map((q, idx) => (
              <div key={q.id || idx} className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-md">Q{idx + 1}</span>
                        <span className="text-xs font-bold text-gray-400">Question Log #{q.question_log_id}</span>
                      </div>
                      <h4 className="text-md font-bold text-gray-900 leading-snug">{q.question_text}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-blue-600">{q.question_score || 'N/A'}<span className="text-xs font-normal text-gray-400 ml-1">/ 5.0</span></div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Confidence Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <MetricBox 
                      title="시선 집중도" 
                      value={((q.gaze_analysis?.focus_ratio || 0) * 100).toFixed(0)} 
                      unit="%" 
                      color="text-indigo-600" 
                      bgColor="bg-indigo-50/30" 
                      borderColor="border-indigo-100"
                    />
                    <MetricBox 
                      title="발음 명확도" 
                      value={((q.audio_analysis?.clarity_score || 0) * 100).toFixed(0)} 
                      unit="%" 
                      color="text-emerald-600" 
                      bgColor="bg-emerald-50/30" 
                      borderColor="border-emerald-100"
                    />
                    <MetricBox 
                      title="감정 변동" 
                      value={q.facial_expressions?.emotion_variation || 'N/A'} 
                      color="text-amber-600" 
                      bgColor="bg-amber-50/30" 
                      borderColor="border-amber-100"
                    />
                    <MetricBox 
                      title="자세 점수" 
                      value={((q.posture_analysis?.posture_score || 0) * 100).toFixed(0)} 
                      unit="%" 
                      color="text-purple-600" 
                      bgColor="bg-purple-50/30" 
                      borderColor="border-purple-100"
                    />
                  </div>

                  {/* 답변 및 피드백 */}
                  <div className="mt-4 space-y-3 pt-3 border-t border-gray-50">
                    {/* 지원자 답변 섹션 */}
                    <div>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">지원자 답변</p>
                      <div className="bg-gray-50/50 rounded-xl p-3 text-sm text-gray-600 italic leading-relaxed">
                        "{q.answer_text || q.audio_analysis?.transcription || '답변 내용이 없습니다.'}"
                      </div>
                    </div>

                    {/* 피드백 섹션 */}
                    {q.question_feedback && (
                      <div className="flex items-start gap-2">
                        <MdOutlineAutoAwesome className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">AI Feedback</p>
                          <div className="text-sm text-gray-700 font-medium space-y-1">
                            {(() => {
                              try {
                                const feedback = typeof q.question_feedback === 'string' 
                                  ? JSON.parse(q.question_feedback) 
                                  : q.question_feedback;
                                
                                if (Array.isArray(feedback)) {
                                  return feedback.map((msg, i) => (
                                    <p key={i} className="flex items-start gap-2">
                                      <span className="text-emerald-400 mt-1">•</span>
                                      <span>{msg}</span>
                                    </p>
                                  ));
                                }
                                return <p>{feedback}</p>;
                              } catch (e) {
                                return <p>{q.question_feedback}</p>;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MdOutlineAnalytics className="text-3xl text-gray-400" />
            </div>
            <h4 className="text-gray-900 font-bold mb-1">상세 분석 데이터가 없습니다</h4>
            <p className="text-gray-500 text-sm mb-6">영상 분석을 실행하거나 기존 결과를 로드해주세요.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={loadInterviewData}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                데이터 새로고침
              </button>
              <button 
                onClick={async () => {
                  try {
                    await QuestionVideoAnalysisApi.startQuestionAnalysis(applicant.application_id);
                    alert('질문별 분석이 시작되었습니다. 잠시 후 다시 확인해주세요.');
                  } catch (err) {
                    alert('분석 시작 실패: ' + err.message);
                  }
                }}
                className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all"
              >
                질문별 정밀 분석 실행
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Video Analysis 서비스 결과 표시 */}
      {interviewData?.videoAnalysisSource === 'video-analysis-db' && (
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MdOutlineAnalytics className="text-green-600" />
            Video Analysis 서비스 결과 (DB 저장)
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 얼굴 표정 분석 */}
            <div className="bg-white rounded-lg p-4 border">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FaSmile className="text-blue-500" />
                얼굴 표정
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">미소 빈도</span>
                  <span className="font-medium">{(interviewData.videoAnalysis?.facial_expressions?.smile_frequency * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">시선 접촉</span>
                  <span className="font-medium">{(interviewData.videoAnalysis?.facial_expressions?.eye_contact_ratio * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">감정 변화</span>
                  <span className="font-medium">{(interviewData.videoAnalysis?.facial_expressions?.emotion_variation * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            {/* 자세 분석 */}
            <div className="bg-white rounded-lg p-4 border">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FiUser className="text-green-500" />
                자세 분석
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">자세 변화</span>
                  <span className="font-medium">{interviewData.videoAnalysis?.posture_analysis?.posture_changes}회</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">끄덕임</span>
                  <span className="font-medium">{interviewData.videoAnalysis?.posture_analysis?.nod_count}회</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">자세 점수</span>
                  <span className="font-medium">{(interviewData.videoAnalysis?.posture_analysis?.posture_score * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            {/* 시선 분석 */}
            <div className="bg-white rounded-lg p-4 border">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FiTarget className="text-purple-500" />
                시선 분석
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">시선 회피</span>
                  <span className="font-medium">{interviewData.videoAnalysis?.gaze_analysis?.eye_aversion_count}회</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">집중도</span>
                  <span className="font-medium">{(interviewData.videoAnalysis?.gaze_analysis?.focus_ratio * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">시선 일관성</span>
                  <span className="font-medium">{(interviewData.videoAnalysis?.gaze_analysis?.gaze_consistency * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            {/* 음성 분석 */}
            <div className="bg-white rounded-lg p-4 border">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <MdOutlineVolumeUp className="text-orange-500" />
                음성 분석
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">발화 속도</span>
                  <span className="font-medium">{interviewData.videoAnalysis?.audio_analysis?.speech_rate} wpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">명확도</span>
                  <span className="font-medium">{(interviewData.videoAnalysis?.audio_analysis?.clarity_score * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">음량 일관성</span>
                  <span className="font-medium">{(interviewData.videoAnalysis?.audio_analysis?.volume_consistency * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 종합 점수 및 피드백 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 border">
              <h5 className="font-medium text-gray-900 mb-3">종합 점수</h5>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {(interviewData.videoAnalysis?.overall_score * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                분석 시간: {new Date(interviewData.videoAnalysis?.analysis_timestamp).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border">
              <h5 className="font-medium text-gray-900 mb-3">AI 피드백</h5>
              <div className="space-y-2">
                {interviewData.videoAnalysis?.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span className="text-sm text-gray-700">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 피드백 */}
      {(interviewData?.videoAnalysis?.feedback || interviewData?.whisperAnalysis?.analysis?.feedback || interviewData?.evaluation?.feedback) && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MdOutlineAnalytics className="text-blue-600" />
            AI 피드백
          </h4>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {interviewData.videoAnalysis?.feedback || interviewData.whisperAnalysis?.analysis?.feedback || interviewData.evaluation?.feedback}
          </p>
        </div>
      )}

      {/* 상세 분석 (드롭다운) */}
      <div className="mt-8 space-y-3">
        {/* STT 분석 결과 드롭다운 */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenStt(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
          >
            <span className="font-medium text-gray-900 flex items-center gap-2">
              <MdOutlineRecordVoiceOver className="text-purple-600" /> STT 분석 결과
            </span>
            <span className="text-gray-500">{openStt ? '접기' : '펼치기'}</span>
          </button>
          {openStt && (
            <div className="p-4 bg-white text-sm text-gray-800 space-y-3">
              {!interviewData?.whisperAnalysis ? (
                <div className="text-gray-500">STT 분석 결과가 없습니다. 우측 상단에서 Whisper 분석을 실행하거나, STT 탭에서 다시 로드하세요.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-purple-50 rounded p-3">
                      <div className="text-purple-600">전사 길이</div>
                      <div className="text-lg font-semibold text-purple-900">{interviewData.whisperAnalysis.analysis?.transcription_length || interviewData.whisperAnalysis.transcription?.length || 0}자</div>
                    </div>
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-blue-600">점수</div>
                      <div className="text-lg font-semibold text-blue-900">{interviewData.whisperAnalysis.analysis?.score ?? 'N/A'}</div>
                    </div>
                    <div className="bg-green-50 rounded p-3">
                      <div className="text-green-600">생성일</div>
                      <div className="text-sm font-medium text-green-900">{interviewData.whisperAnalysis.analysis?.timestamp ? new Date(interviewData.whisperAnalysis.analysis.timestamp).toLocaleString() : 'N/A'}</div>
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => setActiveTab('whisper')}
                      className="px-3 py-2 text-xs rounded bg-purple-600 text-white hover:bg-purple-700"
                    >
                      STT 상세 전체 보기
                    </button>
                    <button
                      onClick={() => setShowDetailedWhisperAnalysis(true)}
                      className="px-3 py-2 text-xs rounded bg-gray-700 text-white hover:bg-gray-800"
                    >
                      상세 Whisper 분석 (모달)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Whisper 세부 지표 드롭다운 */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenWhisper(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
          >
            <span className="font-medium text-gray-900 flex items-center gap-2">
              <MdOutlineAnalytics className="text-green-600" /> Whisper 세부 지표
            </span>
            <span className="text-gray-500">{openWhisper ? '접기' : '펼치기'}</span>
          </button>
          {openWhisper && (
            <div className="p-4 bg-white text-sm text-gray-800 space-y-3">
              {!interviewData?.whisperAnalysis ? (
                <div className="text-gray-500">세부 지표가 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-600 text-xs mb-1">분당 발화 속도</div>
                    <div className="font-bold text-blue-600">{interviewData.whisperAnalysis.analysis?.speaking_speed_wpm ?? 'N/A'} wpm</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-600 text-xs mb-1">발화 시간 / 총 시간</div>
                    <div className="font-bold">{interviewData.whisperAnalysis.analysis?.speaking_time?.toFixed(1) || '0'}s / {interviewData.whisperAnalysis.analysis?.total_duration?.toFixed(1) || '0'}s</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-600 text-xs mb-1">침묵 비율</div>
                    <div className="font-bold text-orange-600">{((interviewData.whisperAnalysis.analysis?.silence_ratio || 0) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-600 text-xs mb-1">감정 상태</div>
                    <div className="font-bold text-green-600">{interviewData.whisperAnalysis.analysis?.emotion || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-600 text-xs mb-1">면접 태도</div>
                    <div className="font-bold text-purple-600">{interviewData.whisperAnalysis.analysis?.attitude || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-600 text-xs mb-1">평균 피치</div>
                    <div className="font-bold">{interviewData.whisperAnalysis.analysis?.avg_pitch ? `${interviewData.whisperAnalysis.analysis.avg_pitch.toFixed(1)}Hz` : 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-600 text-xs mb-1">평균 에너지</div>
                    <div className="font-bold">{interviewData.whisperAnalysis.analysis?.avg_energy?.toFixed?.(4) ?? 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-600 text-xs mb-1">세그먼트 수</div>
                    <div className="font-bold">{interviewData.whisperAnalysis.analysis?.segment_count ?? 'N/A'}개</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 질문별 분석 결과 드롭다운 */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenQuestion(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
          >
            <span className="font-medium text-gray-900 flex items-center gap-2">
              <MdOutlineVideoLibrary className="text-blue-600" /> 질문별 분석 결과
            </span>
            <span className="text-gray-500">{openQuestion ? '접기' : '펼치기'}</span>
          </button>
          {openQuestion && (
            <div className="p-4 bg-white text-sm text-gray-800">
              <div className="text-gray-600 mb-3">질문/답변 구간별 상세 분석은 모달에서 확인하세요.</div>
              <button
                onClick={() => setShowQuestionAnalysisModal(true)}
                className="px-3 py-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                질문별 분석 모달 열기
              </button>
            </div>
          )}
        </div>
        
        {/* QA 분석 결과 드롭다운 추가 */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenQa(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
          >
            <span className="font-medium text-gray-900 flex items-center gap-2">
              <MdOutlineRecordVoiceOver className="text-green-600" /> QA 분석 결과
            </span>
            <span className="text-gray-500">{openQa ? '접기' : '펼치기'}</span>
          </button>
          {openQa && (
            <div className="p-4 bg-white text-sm text-gray-800">
              {!interviewData?.qaAnalysis ? (
                <div className="text-gray-500 mb-3">
                  QA 분석 결과가 없습니다. 위의 "드라이브→QA" 또는 "로컬→QA" 버튼을 클릭하여 분석을 실행하세요.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="bg-green-50 rounded p-3">
                      <div className="text-green-600">총 질문-답변 쌍</div>
                      <div className="text-lg font-semibold text-green-900">{interviewData.qaAnalysis.total_pairs || 0}개</div>
                    </div>
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-blue-600">지원자 화자 ID</div>
                      <div className="text-sm font-medium text-blue-900">{interviewData.qaAnalysis.applicant_speaker_id || 'N/A'}</div>
                    </div>
                    <div className="bg-purple-50 rounded p-3">
                      <div className="text-purple-600">분석 상태</div>
                      <div className="text-sm font-medium text-purple-900">완료</div>
                    </div>
                  </div>
                  
                  {/* QA 페어 목록 */}
                  <div className="space-y-3">
                    <h6 className="font-medium text-gray-800">질문-답변 분석 결과:</h6>
                    {interviewData.qaAnalysis.qa && interviewData.qaAnalysis.qa.length > 0 ? (
                      interviewData.qaAnalysis.qa.map((pair, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Q&A #{pair.index || index + 1}
                            </span>
                            <span className="text-xs text-gray-500">
                              {pair.answer?.start ? `${pair.answer.start.toFixed(1)}s - ${pair.answer.end.toFixed(1)}s` : 'N/A'}
                            </span>
                          </div>
                          
                          {/* 질문 (있는 경우) */}
                          {pair.question && (
                            <div className="mb-2 p-2 bg-blue-50 rounded">
                              <div className="text-xs text-blue-600 font-medium mb-1">질문:</div>
                              <div className="text-sm text-blue-800">
                                {pair.question.start ? `${pair.question.start.toFixed(1)}s - ${pair.question.end.toFixed(1)}s` : '질문 구간'}
                              </div>
                            </div>
                          )}
                          
                          {/* 답변 분석 */}
                          <div className="p-2 bg-green-50 rounded">
                            <div className="text-xs text-green-600 font-medium mb-1">답변:</div>
                            <div className="text-sm text-gray-800 mb-2">
                              {pair.analysis?.text || pair.analysis?.transcription || '전사 텍스트 없음'}
                            </div>
                            
                            {/* 답변 세부 정보 */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600">발화 속도:</span>
                                <span className="ml-1 font-medium">{pair.analysis?.speech_rate || 'N/A'} wpm</span>
                              </div>
                              <div>
                                <span className="text-gray-600">세그먼트:</span>
                                <span className="ml-1 font-medium">{pair.analysis?.segments_count || 'N/A'}개</span>
                              </div>
                              <div>
                                <span className="text-gray-600">언어:</span>
                                <span className="ml-1 font-medium">{pair.analysis?.language || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">오디오:</span>
                                <span className="ml-1 font-medium">
                                  {pair.answer_audio_path ? '저장됨' : '임시'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-center py-4">
                        QA 분석 결과가 없습니다.
                      </div>
                    )}
                  </div>
                  
                  {/* 추가 분석 결과 (감정/문맥) */}
                  {interviewData.qaAnalysis.extra_emotion_context && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                      <h6 className="font-medium text-yellow-800 mb-2">추가 분석 결과:</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-yellow-600">통합 전사 길이:</span>
                          <span className="ml-1 font-medium">{interviewData.qaAnalysis.extra_emotion_context.combined_transcription_length || 0}자</span>
                        </div>
                        <div>
                          <span className="text-yellow-600">감정 분석:</span>
                          <span className="ml-1 font-medium">
                            {interviewData.qaAnalysis.extra_emotion_context.emotion_analysis ? '완료' : '미완료'}
                          </span>
                        </div>
                        <div>
                          <span className="text-yellow-600">문맥 분석:</span>
                          <span className="ml-1 font-medium">
                            {interviewData.qaAnalysis.extra_emotion_context.context_analysis ? '완료' : '미완료'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisTab;

