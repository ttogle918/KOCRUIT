import React, { useState, useEffect, useRef } from 'react';
import { 
  FiRefreshCw, FiMessageSquare, FiMic, FiPlay, FiFilter, 
  FiActivity, FiChevronDown, FiChevronUp, FiCpu, FiSmile, FiBarChart2,
  FiCheckCircle, FiPlus, FiTrash2, FiList, FiCheckSquare
} from 'react-icons/fi';
import api from '../../api/api';
import InterviewQuestionApi from '../../api/interviewQuestionApi';
import { mockQuestions, mockSttLogs } from '../../api/mockData';

// --- [Component] Audio Visualizer ---
const AudioVisualizer = ({ isRecording }) => {
  if (!isRecording) return null;
  
  return (
    <div className="flex items-center gap-1 h-8 px-2">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-red-500 rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 100}%`,
            animationDuration: `${0.5 + Math.random() * 0.5}s`
          }}
        />
      ))}
      <span className="ml-2 text-xs font-bold text-red-500 animate-pulse">REC</span>
    </div>
  );
};

// --- [Component] STT Log Item with Timeline Style ---
const SttLogItem = ({ log, getInterviewTypeLabel, getAnswerText }) => {
  const [expanded, setExpanded] = useState(false);

  // 감정 분석 더미 데이터 (실제 데이터가 없으면 랜덤 생성 또는 기본값)
  const emotion = log.emotion || 'NEUTRAL'; 
  const score = log.answer_score || 0;
  const keywords = ['React', 'Spring', 'MSA', 'Docker', '프로젝트', '협업', '책임감']; // 하이라이팅할 키워드 예시

  // 키워드 하이라이팅 함수
  const highlightKeywords = (text) => {
    if (!text) return '내용 없음';
    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<strong class="text-blue-600">$1</strong>');
    });
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  const getEmotionBadgeColor = (emotion) => {
    const colors = {
      'POSITIVE': 'bg-green-100 text-green-800 border-green-200',
      'NEGATIVE': 'bg-red-100 text-red-800 border-red-200',
      'NEUTRAL': 'bg-gray-100 text-gray-800 border-gray-200',
      'NERVOUS': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[emotion] || colors['NEUTRAL'];
  };

  return (
    <div className="relative pl-4 pb-6 border-l-2 border-gray-200 last:border-0 last:pb-0">
      {/* 타임라인 점 */}
      <div className="absolute top-0 left-[-9px] w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
      
      {/* 질문 카드 (왼쪽/상단) */}
      <div className="mb-2">
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 mb-1">
          {getInterviewTypeLabel(log.interview_type)}
        </span>
        <h4 className="text-sm font-bold text-gray-800 leading-tight">
          Q. {log.question_text}
        </h4>
        <span className="text-xs text-gray-400">
          {log.created_at ? new Date(log.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
        </span>
      </div>

      {/* 답변 말풍선 (오른쪽/하단 강조) */}
      <div className={`group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${expanded ? 'ring-2 ring-blue-100' : ''}`}>
        {/* 답변 헤더 (배지 영역) */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600">A. 답변</span>
            {/* AI 분석 요약 배지들 */}
            <div className="flex gap-1">
              <span className={`px-1.5 py-0.5 text-[10px] rounded border ${getEmotionBadgeColor(emotion)}`}>
                {emotion}
              </span>
              {score > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded border bg-blue-50 text-blue-700 border-blue-100">
                  적합도 {score}%
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>

        {/* 답변 내용 */}
        <div className="p-4 text-sm text-gray-700 leading-relaxed">
          {highlightKeywords(getAnswerText(log))}
        </div>

        {/* 상세 분석 (아코디언) */}
        {expanded && (
          <div className="px-4 py-3 bg-slate-50 border-t border-gray-100 text-xs space-y-2 animate-fadeIn">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="flex items-center gap-1 text-gray-500 mb-1">
                  <FiActivity size={10} /> <span>음성 떨림/안정도</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '85%' }}></div>
                </div>
                <div className="text-right text-[10px] text-gray-400 mt-0.5">안정적 (85%)</div>
              </div>
              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="flex items-center gap-1 text-gray-500 mb-1">
                  <FiSmile size={10} /> <span>감정 긍정/부정</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '70%' }}></div>
                </div>
                <div className="text-right text-[10px] text-gray-400 mt-0.5">긍정적 (70%)</div>
              </div>
            </div>

            {log.answer_feedback && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded text-yellow-800">
                <strong className="block mb-1 text-[10px] uppercase tracking-wider text-yellow-600">AI Feedback</strong>
                {log.answer_feedback}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              {log.answer_audio_url && (
                <button className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-600">
                  <FiMic size={10} /> 다시 듣기
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


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
  const [activeTab, setActiveTab] = useState(0); // 0: 전체질문, 1: 선택질문, 2: 실시간분석
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // 필터링 상태
  const [activeFilter, setActiveFilter] = useState(null);
  const [activeDifficulty, setActiveDifficulty] = useState(null);

  // STT 답변 데이터 상태
  const [sttAnswers, setSttAnswers] = useState([]);
  const [sttLoading, setSttLoading] = useState(false);

  // [New] 선택/고정된 질문 상태
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [customQuestionInput, setCustomQuestionInput] = useState('');

  // 난이도 값 정규화 함수
  const normalizeDifficulty = (difficulty) => {
    if (!difficulty) return null;
    const normalized = difficulty.toUpperCase();
    if (normalized === 'HARD') return 'HARD';
    if (normalized === 'MEDIUM') return 'MEDIUM';
    if (normalized === 'EASY') return 'EASY';
    return normalized; 
  };

  // 질문 내역 가져오기
  const fetchQuestions = async () => {
    if (!applicationId) {
      setError('지원자 ID가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let mainQuestions = [];
      if (interviewType === 'practical') {
        const practicalResponse = await InterviewQuestionApi.getPracticalQuestions(applicationId);
        mainQuestions = practicalResponse.questions || [];
      } else if (interviewType === 'executive') {
        const executiveResponse = await InterviewQuestionApi.getExecutiveQuestions(applicationId);
        mainQuestions = executiveResponse.questions || [];
      }

      // 개인별 심층 질문(AI 생성) 가져오기
      let personalQs = [];
      try {
        const personalRes = await InterviewQuestionApi.getPersonalQuestions(applicationId);
        if (personalRes && personalRes.questions) {
          personalQs = personalRes.questions.map(q => ({
            question_text: typeof q === 'string' ? q : q.question_text,
            type: 'PERSONAL',
            difficulty: 'HARD'
          }));
        }
      } catch (e) {
        console.log('개인별 심층 질문 없음');
      }

      setQuestions(prev => ({
        ...prev,
        [interviewType]: [...mainQuestions, ...personalQs]
      }));
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('질문 내역 조회 실패:', err);
      // setError('질문 내역을 가져오는데 실패했습니다: ' + (err.message || '알 수 없는 오류'));
      console.log('⚠️ API 호출 실패. Mock Data를 사용합니다.');
      setQuestions(mockQuestions);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // STT 답변 데이터 가져오기
  const fetchSttAnswers = async () => {
    if (!applicationId) return;

    setSttLoading(true);
    try {
      const data = await InterviewQuestionApi.getInterviewLogs(applicationId);
      const answersWithQuestions = (data || []).filter(log => 
        log.answer_text || log.answer_text_transcribed || log.answer_audio_url
      );
      setSttAnswers(answersWithQuestions);
    } catch (err) {
      console.error('STT 답변 데이터 조회 실패:', err);
      console.log('⚠️ API 호출 실패. Mock Data를 사용합니다.');
      setSttAnswers(mockSttLogs);
    } finally {
      setSttLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchQuestions();
      fetchSttAnswers();
    }
  }, [applicationId]);

  const handleRefresh = () => {
    fetchQuestions();
    fetchSttAnswers();
  };

  // [New] 질문 고정/해제 처리
  const handleToggleSelect = (question) => {
    const isAlreadySelected = selectedQuestions.some(q => 
      (typeof q === 'string' ? q : q.question_text) === (typeof question === 'string' ? question : question.question_text)
    );

    if (isAlreadySelected) {
      // 이미 선택된 경우 제거
      setSelectedQuestions(prev => prev.filter(q => 
        (typeof q === 'string' ? q : q.question_text) !== (typeof question === 'string' ? question : question.question_text)
      ));
    } else {
      // 선택되지 않은 경우 추가
      setSelectedQuestions(prev => [...prev, question]);
    }
  };

  // [New] 사용자 정의 질문 추가
  const handleAddCustomQuestion = () => {
    if (!customQuestionInput.trim()) return;
    
    const newQuestion = {
      question_text: customQuestionInput,
      type: 'PERSONAL', // 사용자가 추가한 건 개인 질문으로 취급
      difficulty: 'MEDIUM'
    };
    
    setSelectedQuestions(prev => [...prev, newQuestion]);
    setCustomQuestionInput('');
  };

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
    if (newValue === 2) { // 실시간 분석 탭
      fetchSttAnswers();
    }
  };

  const handleFilterChange = (filterType) => {
    setActiveFilter(activeFilter === filterType ? null : filterType);
  };

  const handleDifficultyChange = (difficulty) => {
    setActiveDifficulty(activeDifficulty === difficulty ? null : difficulty);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setActiveDifficulty(null);
  };

  // 탭별 데이터
  const tabData = [
    { label: '전체 질문', key: 'questions', icon: '📋' },
    { label: '선택/추가', key: 'selected', icon: '📌' },
    { label: '실시간 분석', key: 'stt', icon: '📝' }
  ];

  const getQuestionTypeLabel = () => {
    if (interviewType === 'practical') return '실무진 면접 질문';
    if (interviewType === 'executive') return '임원진 면접 질문';
    return '면접 질문';
  };

  const getCurrentQuestions = () => {
    if (interviewType === 'practical') return questions.practical || [];
    if (interviewType === 'executive') return questions.executive || [];
    return [];
  };

  // 필터링된 질문 데이터 (전체 질문 탭용)
  const getFilteredQuestions = () => {
    const currentQuestions = getCurrentQuestions();
    
    return currentQuestions.filter(question => {
      if (typeof question === 'string') return false;
      
      let passType = true;
      let passDifficulty = true;

      if (activeFilter) passType = question.type === activeFilter;
      if (activeDifficulty) {
        const normalizedDiff = normalizeDifficulty(question.difficulty);
        passDifficulty = normalizedDiff === activeDifficulty;
      }

      return passType && passDifficulty;
    });
  };

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

  const getQuestionDifficultyStats = () => {
    const currentQuestions = getCurrentQuestions();
    const stats = { 'HARD': 0, 'MEDIUM': 0, 'EASY': 0 };
    currentQuestions.forEach(question => {
      if (typeof question === 'object' && question.difficulty) {
        const normalizedDiff = normalizeDifficulty(question.difficulty);
        if (stats[normalizedDiff] !== undefined) {
          stats[normalizedDiff] = (stats[normalizedDiff] || 0) + 1;
        }
      }
    });
    return stats;
  };

  const getTypeColor = (type) => {
    const colorMap = {
      'COMMON': 'bg-blue-100 text-blue-800 border-blue-200',
      'JOB': 'bg-green-100 text-green-800 border-green-200',
      'PERSONAL': 'bg-purple-100 text-purple-800 border-purple-200',
      'EXECUTIVE': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTypeLabel = (type) => {
    const labelMap = { 
      'COMMON': '공통', 
      'JOB': '직무', 
      'PERSONAL': '개인', 
      'EXECUTIVE': '임원' 
    };
    return labelMap[type] || type;
  };

  const getDifficultyColor = (difficulty) => {
    const normalized = normalizeDifficulty(difficulty);
    const colorMap = { 'HARD': 'red', 'MEDIUM': 'yellow', 'EASY': 'green' };
    return colorMap[normalized] || 'gray';
  };

  const getDifficultyLabel = (difficulty) => {
    const normalized = normalizeDifficulty(difficulty);
    const labelMap = { 'HARD': '상', 'MEDIUM': '중', 'EASY': '하' };
    return labelMap[normalized] || difficulty;
  };

  const getInterviewTypeLabel = (type) => {
    const labelMap = {
      'AI_INTERVIEW': 'AI 면접',
      'PRACTICAL_INTERVIEW': '실무진 면접',
      'EXECUTIVE_INTERVIEW': '임원진 면접',
      'FINAL_INTERVIEW': '최종 면접'
    };
    return labelMap[type] || type;
  };

  const getAnswerText = (log) => log.answer_text_transcribed || log.answer_text || '답변 없음';

  if (!applicationId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 h-full">
        <div className="text-center text-gray-500">지원자를 선택해주세요</div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 h-full">
        <div className="text-center text-gray-500">이력서 정보가 없어 질문을 추천할 수 없습니다</div>
      </div>
    );
  }

  const questionStats = getQuestionTypeStats();
  const difficultyStats = getQuestionDifficultyStats();
  const filteredQuestions = getFilteredQuestions();
  const currentQuestions = getCurrentQuestions();

  const filterButtons = [
    { type: 'COMMON', label: '공통', count: questionStats['COMMON'] || 0, color: 'blue' },
    { type: 'JOB', label: '직무', count: questionStats['JOB'] || 0, color: 'green' },
    { type: 'PERSONAL', label: '개인', count: questionStats['PERSONAL'] || 0, color: 'purple' },
    { type: 'EXECUTIVE', label: '임원', count: questionStats['EXECUTIVE'] || 0, color: 'orange' }
  ];

  const difficultyButtons = [
    { type: 'HARD', label: '상', count: difficultyStats['HARD'], color: 'red' },
    { type: 'MEDIUM', label: '중', count: difficultyStats['MEDIUM'], color: 'yellow' },
    { type: 'EASY', label: '하', count: difficultyStats['EASY'], color: 'green' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {applicantName ? `${applicantName}님 면접` : '면접 진행'}
            </h3>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span>{getQuestionTypeLabel()}</span>
              {lastUpdated && (
                <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">
                   {lastUpdated.toLocaleTimeString('ko-KR')} 업데이트
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AudioVisualizer isRecording={isRecording} />
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="새로고침"
            >
              <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1">
          {tabData.map((tab, index) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(index)}
              className={`relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === index
                  ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
              {tab.key === 'selected' && selectedQuestions.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded-full shadow-sm">
                  {selectedQuestions.length}
                </span>
              )}
              {tab.key === 'stt' && (sttAnswers.length > 0 || realtimeAnalysisResults.length > 0) && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-white text-blue-700 border border-blue-100 rounded-full shadow-sm">
                  {sttAnswers.length + realtimeAnalysisResults.length}
                </span>
              )}
              {tab.key === 'stt' && isRecording && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 탭별 내용 */}
      <div className="flex-1 overflow-auto px-4 pb-4 custom-scrollbar">
        {tabData.map((tab, index) => (
          <div key={tab.key} className={activeTab === index ? 'block h-full' : 'hidden'}>
            
            {/* 1. 전체 질문 탭 */}
            {tab.key === 'questions' && (
              loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                    <span className="text-sm text-gray-500">질문 리스트 로딩 중...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 relative">
                  {/* 필터 영역 */}
                  <div className="py-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b mb-2 space-y-2 shadow-sm -mx-4 px-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={clearFilter} className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${!activeFilter && !activeDifficulty ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>전체 ({currentQuestions.length})</button>
                      {filterButtons.map(btn => btn.count > 0 && (
                        <button key={btn.type} onClick={() => handleFilterChange(btn.type)} className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all flex items-center gap-1 ${activeFilter === btn.type ? `bg-${btn.color}-100 text-${btn.color}-800 border-${btn.color}-300` : `bg-white text-gray-600 border-gray-200`}`}>
                          {btn.label} <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/50">{btn.count}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1">Difficulty</span>
                      {difficultyButtons.map(btn => btn.count > 0 && (
                        <button key={btn.type} onClick={() => handleDifficultyChange(btn.type)} className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-all flex items-center gap-1 ${activeDifficulty === btn.type ? `bg-${btn.color}-100 text-${btn.color}-800 border-${btn.color}-300` : `bg-white text-gray-600 border-gray-200`}`}>
                          {btn.label} <span className="px-1 py-0.5 rounded-full text-[9px] bg-white/50">{btn.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 질문 리스트 */}
                  {filteredQuestions.length > 0 ? (
                    <div className="space-y-3 pb-4">
                      {filteredQuestions.map((question, qIndex) => {
                        const isSelected = selectedQuestions.some(q => (typeof q === 'string' ? q : q.question_text) === (typeof question === 'string' ? question : question.question_text));
                        return (
                          <div key={qIndex} className={`p-4 bg-white rounded-xl border transition-all duration-200 group ${isSelected ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex gap-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${getTypeColor(question.type || 'UNKNOWN')}`}>
                                  {typeof question === 'string' ? getQuestionTypeLabel() : getTypeLabel(question.type) || getQuestionTypeLabel()}
                                </span>
                                {typeof question === 'object' && question.difficulty && (
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide bg-${getDifficultyColor(question.difficulty)}-50 text-${getDifficultyColor(question.difficulty)}-700 border border-${getDifficultyColor(question.difficulty)}-200`}>
                                    {getDifficultyLabel(question.difficulty)}
                                  </span>
                                )}
                              </div>
                              {/* 📌 고정 버튼 */}
                              <button 
                                onClick={() => handleToggleSelect(question)}
                                className={`p-1.5 rounded-full transition-colors ${isSelected ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' : 'text-gray-300 hover:text-blue-500 hover:bg-gray-100'}`}
                                title={isSelected ? "고정 해제" : "질문 고정"}
                              >
                                <FiCheckSquare size={18} className={isSelected ? "fill-current" : ""} />
                              </button>
                            </div>
                            <div className={`font-medium leading-relaxed text-sm ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                              {typeof question === 'string' ? question : question.question_text || '질문 내용 없음'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-4">
                      <FiFilter className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-gray-900 font-semibold mb-1">조건에 맞는 질문이 없습니다</p>
                      <button onClick={clearFilter} className="mt-4 px-4 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-blue-600 shadow-sm">필터 초기화</button>
                    </div>
                  )}
                </div>
              )
            )}

            {/* 2. [New] 선택/추가 질문 탭 */}
            {tab.key === 'selected' && (
              <div className="space-y-4 h-full flex flex-col">
                {/* 직접 입력 영역 */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                  <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <FiPlus className="bg-blue-200 rounded-full p-0.5" size={16} /> 나만의 질문 추가
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={customQuestionInput}
                      onChange={(e) => setCustomQuestionInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomQuestion()}
                      placeholder="이 지원자에게 궁금한 점을 입력하세요..."
                      className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    />
                    <button 
                      onClick={handleAddCustomQuestion}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      추가
                    </button>
                  </div>
                </div>

                {/* 선택된 질문 리스트 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {selectedQuestions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Selected Questions ({selectedQuestions.length})</span>
                        <button onClick={() => setSelectedQuestions([])} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                          <FiTrash2 size={12} /> 전체 삭제
                        </button>
                      </div>
                      {selectedQuestions.map((question, index) => (
                        <div key={index} className="p-4 bg-white rounded-xl border border-l-4 border-l-blue-500 border-gray-200 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${getTypeColor(question.type || 'UNKNOWN')}`}>
                              {typeof question === 'string' ? getQuestionTypeLabel() : getTypeLabel(question.type) || getQuestionTypeLabel()}
                            </span>
                            <button 
                              onClick={() => handleToggleSelect(question)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="목록에서 제거"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                          <div className="text-gray-800 font-medium text-sm">
                            {typeof question === 'string' ? question : question.question_text}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <FiCheckSquare className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-600">선택된 질문이 없습니다</p>
                      <p className="text-xs mt-1">전체 질문 탭에서 <FiCheckSquare className="inline mb-0.5" /> 버튼을 눌러<br/>질문을 고정하거나, 직접 입력해보세요.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. 실시간 분석 탭 */}
            {tab.key === 'stt' && (
              <div className="h-full flex flex-col mt-2">
                {/* STT 상태 표시 헤더 */}
                <div className={`mb-4 p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  isRecording 
                    ? 'bg-red-50 border-red-100' 
                    : isRealtimeAnalysisEnabled ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400'
                    }`}>
                      {isRecording ? <FiMic className="animate-pulse" /> : <FiMic />}
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${isRecording ? 'text-red-700' : 'text-gray-700'}`}>
                        {isRecording ? '실시간 분석 중...' : '분석 대기 중'}
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        {isRecording ? '음성 인식 및 감정 분석이 활성화되었습니다.' : '면접이 시작되면 자동으로 분석됩니다.'}
                      </p>
                    </div>
                  </div>
                  {sttAnswers.length > 0 && (
                    <button
                      onClick={fetchSttAnswers}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                    >
                      새로고침
                    </button>
                  )}
                </div>

                {/* 타임라인 리스트 영역 */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {sttAnswers.length > 0 || realtimeAnalysisResults.length > 0 ? (
                    <div className="space-y-1 pl-2 py-2">
                      {realtimeAnalysisResults.map((result, index) => (
                        <div key={`realtime-${index}`} className="relative pl-4 pb-6 border-l-2 border-blue-200 last:border-0">
                          <div className="absolute top-0 left-[-9px] w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm animate-pulse"></div>
                          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-sm text-blue-800">
                            <p className="font-medium mb-1 text-xs text-blue-600">실시간 인식 중...</p>
                            {result.text}
                          </div>
                        </div>
                      ))}
                      {sttAnswers.map((log, index) => (
                        <SttLogItem 
                          key={index} 
                          log={log} 
                          getInterviewTypeLabel={getInterviewTypeLabel} 
                          getAnswerText={getAnswerText} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                         <FiCpu size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">아직 분석 데이터가 없습니다</p>
                      <p className="text-xs mt-1">면접을 진행하면 실시간 분석 결과가 표시됩니다</p>
                      <button onClick={fetchSttAnswers} className="mt-4 px-4 py-2 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">데이터 불러오기</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionRecommendationPanel;
