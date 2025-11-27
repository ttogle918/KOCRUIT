import React, { useState, useEffect } from 'react';
import { FiTarget, FiDatabase, FiRefreshCw, FiX, FiMessageSquare, FiMic, FiPlay, FiPause } from 'react-icons/fi';
import api from '../../api/api';

const QuestionRecommendationPanel = ({ 
  resume, 
  applicantName, 
  applicationId, 
  interviewType = 'practical',
  isRealtimeAnalysisEnabled = false,
  isRecording = false,
  realtimeAnalysisResults = [],
  onSTTToggle = () => {},
  onRemoveSTTResult = () => {},
  onClearSTTResults = () => {}
}) => {
  const [questions, setQuestions] = useState({
    practical: [],
    executive: [],
    ai: [],
    common: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // 필터링 상태 추가
  const [activeFilter, setActiveFilter] = useState(null);

  // STT 답변 데이터 상태 추가
  const [sttAnswers, setSttAnswers] = useState([]);
  const [sttLoading, setSttLoading] = useState(false);

  // 질문 내역 가져오기
  const fetchQuestions = async () => {
    if (!applicationId) {
      setError('지원자 ID가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 면접 유형에 따라 해당하는 질문만 가져오기
      if (interviewType === 'practical') {
        // 실무진 면접 질문만
        const practicalResponse = await api.get(`/interview-questions/application/${applicationId}/practical-questions`);
        if (practicalResponse.data.questions) {
          setQuestions(prev => ({
            ...prev,
            practical: practicalResponse.data.questions
          }));
        }
      } else if (interviewType === 'executive') {
        // 임원진 면접 질문만
        const executiveResponse = await api.get(`/interview-questions/application/${applicationId}/executive-questions`);
        if (executiveResponse.data.questions) {
          setQuestions(prev => ({
            ...prev,
            executive: executiveResponse.data.questions
          }));
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('질문 내역 조회 실패:', err);
      setError('질문 내역을 가져오는데 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  // STT 답변 데이터 가져오기
  const fetchSttAnswers = async () => {
    if (!applicationId) return;

    setSttLoading(true);
    try {
      // 면접 질문 로그에서 답변 데이터 가져오기
      const response = await api.get(`/interview-questions/application/${applicationId}/logs`);
      
      // 답변이 있는 데이터만 필터링
      const answersWithQuestions = response.data.filter(log => 
        log.answer_text || log.answer_text_transcribed || log.answer_audio_url
      );
      
      setSttAnswers(answersWithQuestions);
    } catch (err) {
      console.error('STT 답변 데이터 조회 실패:', err);
    } finally {
      setSttLoading(false);
    }
  };

  // 컴포넌트 마운트 시 질문 내역과 STT 답변 데이터 가져오기
  useEffect(() => {
    if (applicationId) {
      fetchQuestions();
      fetchSttAnswers();
    }
  }, [applicationId]);

  // 수동 새로고침
  const handleRefresh = () => {
    fetchQuestions();
    fetchSttAnswers();
  };

  // 질문 추가 처리
  const handleAddQuestion = (question, type) => {
    console.log('질문 추가:', { question, type });
    // TODO: 부모 컴포넌트에서 질문 추가 처리
  };

  // 탭 변경 처리
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
    // STT 탭으로 이동할 때 답변 데이터 새로고침
    if (newValue === 1) {
      fetchSttAnswers();
    }
  };

  // 필터 변경 처리
  const handleFilterChange = (filterType) => {
    if (activeFilter === filterType) {
      setActiveFilter(null); // 같은 필터 클릭 시 해제
    } else {
      setActiveFilter(filterType); // 새로운 필터 설정
    }
  };

  // 필터 초기화
  const clearFilter = () => {
    setActiveFilter(null);
  };

  // 탭별 질문 데이터
  const tabData = [
    { label: '질문내역', key: 'questions', icon: '📋' },
    { label: 'STT 결과', key: 'stt', icon: '🎤' }
  ];

  // 면접 유형에 따른 질문 유형 표시
  const getQuestionTypeLabel = () => {
    if (interviewType === 'practical') {
      return '실무진 면접 질문';
    } else if (interviewType === 'executive') {
      return '임원진 면접 질문';
    }
    return '면접 질문';
  };

  // 현재 면접 유형에 따른 질문 데이터
  const getCurrentQuestions = () => {
    if (interviewType === 'practical') {
      return questions.practical || [];
    } else if (interviewType === 'executive') {
      return questions.executive || [];
    }
    return [];
  };

  // 필터링된 질문 데이터
  const getFilteredQuestions = () => {
    const currentQuestions = getCurrentQuestions();
    if (!activeFilter) return currentQuestions;
    
    return currentQuestions.filter(question => {
      if (typeof question === 'string') return false; // 문자열 질문은 타입 정보가 없음
      return question.type === activeFilter;
    });
  };

  // 질문 타입별 통계
  const getQuestionTypeStats = () => {
    const currentQuestions = getCurrentQuestions();
    const stats = {};
    
    currentQuestions.forEach(question => {
      if (typeof question === 'object' && question.type) {
        stats[question.type] = (stats[question.type] || 0) + 1;
      }
    });
    
    return stats;
  };

  // 타입별 색상 매핑
  const getTypeColor = (type) => {
    const colorMap = {
      'COMMON': 'bg-blue-100 text-blue-800 border-blue-200',
      'JOB': 'bg-green-100 text-green-800 border-green-200',
      'PERSONAL': 'bg-purple-100 text-purple-800 border-purple-200',
      'EXECUTIVE': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // 타입별 한글 라벨
  const getTypeLabel = (type) => {
    const labelMap = {
      'COMMON': '공통',
      'JOB': '직무',
      'PERSONAL': '개인',
      'EXECUTIVE': '임원'
    };
    return labelMap[type] || type;
  };

  // 면접 유형 한글 라벨
  const getInterviewTypeLabel = (type) => {
    const labelMap = {
      'AI_INTERVIEW': 'AI 면접',
      'PRACTICAL_INTERVIEW': '실무진 면접',
      'EXECUTIVE_INTERVIEW': '임원진 면접',
      'FINAL_INTERVIEW': '최종 면접'
    };
    return labelMap[type] || type;
  };

  // 답변 텍스트 표시 (STT 우선, 일반 답변 차선)
  const getAnswerText = (log) => {
    return log.answer_text_transcribed || log.answer_text || '답변 없음';
  };

  if (!applicationId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 h-full">
        <div className="text-center text-gray-500">
          지원자를 선택해주세요
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 h-full">
        <div className="text-center text-gray-500">
          이력서 정보가 없어 질문을 추천할 수 없습니다
        </div>
      </div>
    );
  }

  const questionStats = getQuestionTypeStats();
  const filteredQuestions = getFilteredQuestions();

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {applicantName ? `${applicantName}님 면접` : '면접 진행'}
            </h3>
            <p className="text-sm text-gray-600">
              {getQuestionTypeLabel()} - {lastUpdated ? `최종 업데이트: ${lastUpdated.toLocaleTimeString('ko-KR')}` : '업데이트 없음'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="새로고침"
          >
            <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1">
          {tabData.map((tab, index) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(index)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === index
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
              {tab.key === 'stt' && (sttAnswers.length > 0 || realtimeAnalysisResults.length > 0) && (
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  {sttAnswers.length + realtimeAnalysisResults.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 탭별 내용 - 스크롤 가능한 영역 */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {tabData.map((tab, index) => (
          <div key={tab.key} className={activeTab === index ? 'block' : 'hidden'}>
            {tab.key === 'questions' ? (
              // 질문내역 탭
              loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2"></div>
                  <span className="text-gray-500">질문 내역을 불러오는 중...</span>
                </div>
              ) : filteredQuestions.length > 0 ? (
                <div className="space-y-3">
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="font-medium text-blue-800 mb-2">
                      {activeFilter ? `${getTypeLabel(activeFilter)} 질문` : getQuestionTypeLabel()}
                    </h4>
                    <p className="text-sm text-blue-600">
                      총 {filteredQuestions.length}개의 질문이 표시됩니다.
                      {activeFilter && (
                        <span className="ml-2 text-blue-500">
                          (전체 {getCurrentQuestions().length}개 중)
                        </span>
                      )}
                    </p>
                  </div>
                  {filteredQuestions.map((question, qIndex) => (
                    <div key={qIndex} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="mb-2 text-gray-800">
                        {typeof question === 'string' ? question : question.question_text || '질문 내용 없음'}
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* <button
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                          onClick={() => handleAddQuestion(question, 'question')}
                        >
                          <FiTarget className="inline mr-1" />
                          질문 추가
                        </button> */}
                        <span className={`px-2 py-1 text-xs rounded border ${getTypeColor(question.type || 'UNKNOWN')}`}>
                          {typeof question === 'string' ? getQuestionTypeLabel() : getTypeLabel(question.type) || getQuestionTypeLabel()}
                        </span>
                        {typeof question === 'object' && question.difficulty && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            {question.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiDatabase className="inline-block w-8 h-8 mb-2 text-gray-400" />
                  <p>
                    {activeFilter 
                      ? `${getTypeLabel(activeFilter)} 타입의 질문이 없습니다.`
                      : '준비된 질문이 없습니다.'
                    }
                  </p>
                  <p className="text-sm">
                    {activeFilter 
                      ? '다른 타입을 선택하거나 전체 보기로 돌아가보세요.'
                      : '새로고침 버튼을 클릭하여 질문을 가져와보세요.'
                    }
                  </p>
                </div>
              )
            ) : (
              // STT 결과 탭
              <div className="space-y-4">
                {/* STT 상태 표시 */}
                {isRealtimeAnalysisEnabled && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-blue-700">
                      <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-sm font-medium">
                        {isRecording ? '음성 인식 중...' : 'STT 준비됨'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 저장된 STT 답변 데이터 */}
                {sttAnswers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800 flex items-center">
                        <FiMessageSquare className="mr-2 text-blue-600" />
                        저장된 답변 데이터 ({sttAnswers.length}개)
                      </h4>
                      <button
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        onClick={fetchSttAnswers}
                      >
                        새로고침
                      </button>
                    </div>
                    
                    {sttAnswers.map((log, index) => (
                      <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        {/* 면접 유형 및 질문 */}
                        <div className="mb-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {getInterviewTypeLabel(log.interview_type)}
                            </span>
                            {log.created_at && (
                              <span className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleString('ko-KR')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-800 mb-2">
                            <span className="text-blue-600">Q:</span> {log.question_text}
                          </div>
                        </div>

                        {/* 답변 내용 */}
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-800 mb-2">
                            <span className="text-green-600">A:</span> 답변
                          </div>
                          <div className="p-3 bg-white rounded border">
                            <div className="text-gray-700 mb-2">
                              {getAnswerText(log)}
                            </div>
                            
                            {/* 답변 메타데이터 */}
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              {log.emotion && (
                                <span className="flex items-center">
                                  <span className="mr-1">감정:</span>
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                    {log.emotion}
                                  </span>
                                </span>
                              )}
                              {log.attitude && (
                                <span className="flex items-center">
                                  <span className="mr-1">태도:</span>
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                    {log.attitude}
                                  </span>
                                </span>
                              )}
                              {log.answer_score && (
                                <span className="flex items-center">
                                  <span className="mr-1">점수:</span>
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                                    {log.answer_score}점
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 미디어 파일 및 피드백 */}
                        <div className="flex items-center space-x-4 text-xs">
                          {log.answer_audio_url && (
                            <span className="flex items-center text-blue-600">
                              <FiMic className="mr-1" />
                              오디오 파일
                            </span>
                          )}
                          {log.answer_video_url && (
                            <span className="flex items-center text-purple-600">
                              <FiPlay className="mr-1" />
                              비디오 파일
                            </span>
                          )}
                          {log.answer_feedback && (
                            <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border">
                              <span className="font-medium">피드백:</span> {log.answer_feedback}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 실시간 STT 결과 목록 */}
                {realtimeAnalysisResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800 flex items-center">
                        <FiMic className="mr-2 text-green-600" />
                        실시간 STT 결과 ({realtimeAnalysisResults.length}개)
                      </h4>
                      <button
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        onClick={onClearSTTResults}
                      >
                        초기화
                      </button>
                    </div>
                    <div className="space-y-2">
                      {realtimeAnalysisResults.map((result, index) => (
                        <div key={result.id || index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-gray-800 mb-1">{result.text}</div>
                              <div className="text-xs text-gray-500">
                                {result.timestamp ? new Date(result.timestamp).toLocaleTimeString('ko-KR') : `#${index + 1}`}
                              </div>
                            </div>
                            <button
                              className="ml-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                              onClick={() => onRemoveSTTResult(result.id || index)}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 데이터가 없을 때 */}
                {sttAnswers.length === 0 && realtimeAnalysisResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <span className="inline-block w-8 h-8 mb-2 text-gray-400">🎤</span>
                    <p>STT 결과가 없습니다.</p>
                    <p className="text-sm">면접 진행 후 STT 결과를 확인할 수 있습니다.</p>
                    <button
                      onClick={fetchSttAnswers}
                      className="mt-2 px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      저장된 답변 데이터 확인
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700">
            💡 <strong>팁:</strong> 각 면접 단계별로 생성된 질문들을 확인하고 필요한 질문을 추가할 수 있습니다.
            {activeFilter && (
              <span className="block mt-1">
                🔍 현재 <strong>{getTypeLabel(activeFilter)}</strong> 타입만 필터링되어 표시됩니다.
              </span>
            )}
            {activeTab === 1 && (
              <span className="block mt-1">
                🎤 <strong>STT 탭</strong>에서는 저장된 답변 데이터와 실시간 음성 인식 결과를 모두 확인할 수 있습니다.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionRecommendationPanel;
