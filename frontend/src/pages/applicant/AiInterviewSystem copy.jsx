import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import api from '../../api/api';
import AiInterviewApi from '../../api/aiInterviewApi';
import { 
  FiCamera, FiMic, FiMicOff, FiVideo, FiVideoOff, 
  FiPlay, FiPause, FiSquare, FiSettings, FiUser,
  FiClock, FiTarget, FiTrendingUp, FiAward, FiFolder,
  FiCheck, FiRefreshCw, FiUsers, FiEye, FiFileText,
  FiBarChart2, FiUserMinus, FiInfo, FiX, FiList, FiMessageSquare
} from 'react-icons/fi';
import { 
  MdOutlineAutoAwesome, MdOutlinePsychology,
  MdOutlineLanguage, MdOutlineGesture,
  MdOutlinePsychologyAlt, MdOutlineWork,
  MdOutlineVerified, MdOutlinePlayArrow,
  MdOutlinePause, MdOutlineVolumeUp
} from 'react-icons/md';
import { 
  FaUsers, FaGamepad, FaBrain, FaEye,
  FaSmile, FaHandPaper, FaMicrophone, FaCheckCircle,
  FaTimesCircle, FaUserTie
} from 'react-icons/fa';
import { 
  convertDriveUrlToDirect, 
  extractVideoIdFromUrl, 
  extractFolderIdFromUrl,
  getDriveItemType,
  getVideosFromSharedFolder,
  formatFileSize,
  formatDate
} from '../../utils/googleDrive';
import ResumePage from '../resume/ResumePage';
import InterviewCompletionModal from '../../components/InterviewCompletionModal';
import ApplicantInfoModal from '../../components/ApplicantInfoModal';
import InterviewEvaluationItems from '../../components/InterviewEvaluationItems';
import WhisperAnalysisDisplay from '../../components/WhisperAnalysisDisplay';

// 성능 최적화: 상태 정보 계산 함수
const getStatusInfo = (status, score) => {
  console.log('Status check:', { status, score, type: typeof status });
  
  // AI 면접 완료 상태들 확인
  if (status === 'AI_INTERVIEW_COMPLETED') {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 3.5) {
      return {
        icon: <FaCheckCircle className="w-4 h-4" />,
        text: '합격',
        color: 'bg-green-100 text-green-800',
        score: score
      };
    } else {
      return {
        icon: <FaTimesCircle className="w-4 h-4" />,
        text: '불합격',
        color: 'bg-red-100 text-red-800',
        score: score
      };
    }
  }
  
  // AI 면접 합격 상태
  if (status === 'AI_INTERVIEW_PASSED') {
    return {
      icon: <FaCheckCircle className="w-4 h-4" />,
      text: '합격',
      color: 'bg-green-100 text-green-800',
      score: score
    };
  }
  
  // AI 면접 불합격 상태
  if (status === 'AI_INTERVIEW_FAILED') {
    return {
      icon: <FaTimesCircle className="w-4 h-4" />,
      text: '불합격',
      color: 'bg-red-100 text-red-800',
      score: score
    };
  }
  
  // 다른 면접 단계 완료 상태들 (AI 면접 이후 단계)
  if (status && (
    status.startsWith('FIRST_INTERVIEW_') || 
    status.startsWith('SECOND_INTERVIEW_') || 
    status.startsWith('FINAL_INTERVIEW_')
  )) {
    // AI 점수가 있으면 그 점수로 판정, 없으면 완료로 표시
    const numScore = parseFloat(score) || 0;
    if (numScore > 0) {
      if (numScore >= 3.5) {
        return {
          icon: <FaCheckCircle className="w-4 h-4" />,
          text: '합격',
          color: 'bg-green-100 text-green-800',
          score: score
        };
      } else {
        return {
          icon: <FaTimesCircle className="w-4 h-4" />,
          text: '불합격',
          color: 'bg-red-100 text-red-800',
          score: score
        };
      }
    } else {
      return {
        icon: <FaCheckCircle className="w-4 h-4" />,
        text: '완료',
        color: 'bg-blue-100 text-blue-800',
        score: '완료'
      };
    }
  }
  
  // AI 면접 진행 중 상태
  if (status === 'AI_INTERVIEW_IN_PROGRESS') {
    return {
      icon: <FiClock className="w-4 h-4" />,
      text: '진행중',
      color: 'bg-yellow-100 text-yellow-800',
      score: '진행중'
    };
  }
  
  // AI 면접 대기 상태
  if (status === 'AI_INTERVIEW_PENDING' || status === 'AI_INTERVIEW_SCHEDULED') {
    return {
      icon: <FiClock className="w-4 h-4" />,
      text: '대기중',
      color: 'bg-blue-100 text-blue-800',
      score: '대기중'
    };
  }
  
  // 기본 상태
  return {
    icon: <FiClock className="w-4 h-4" />,
    text: '대기',
    color: 'bg-gray-100 text-gray-800',
    score: '대기'
  };
};

// 성능 최적화: 메모이제이션된 컴포넌트
const MemoizedApplicantCard = React.memo(({ applicant, isSelected, onClick, onInfoClick }) => {
  // 성능 최적화: 상태 정보를 useMemo로 최적화
  const statusInfo = useMemo(() => {
    return getStatusInfo(applicant.interview_status, applicant.ai_interview_score);
  }, [applicant.interview_status, applicant.ai_interview_score]);

  // 성능 최적화: 클릭 핸들러를 useCallback으로 최적화
  const handleEvaluationClick = useCallback(() => {
    onClick(applicant);
  }, [onClick, applicant]);

  const handleInfoClick = useCallback((e) => {
    e.stopPropagation();
    onInfoClick(applicant);
  }, [onInfoClick, applicant]);

  return (
    <div 
      className={`p-4 border rounded-lg transition-all duration-200 ${
        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{applicant.name}</h3>
            <button
              onClick={handleInfoClick}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <FiInfo className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-gray-600">{applicant.email}</p>
          <p className="text-xs text-gray-500">필기점수: {applicant.written_test_score || 'N/A'}</p>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
            {statusInfo.icon}
            <span>{statusInfo.text}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">AI점수: {statusInfo.score}</p>
          <button
            onClick={handleEvaluationClick}
            className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            면접 평가 보기
          </button>
        </div>
      </div>
    </div>
  );
});

MemoizedApplicantCard.displayName = 'MemoizedApplicantCard';

// 성능 최적화: 면접 결과 상세 컴포넌트를 메모이제이션
const InterviewResultDetail = React.memo(({ applicant, onBack }) => {
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('video');
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 성능 최적화: 데이터 로딩을 useCallback으로 최적화
  const fetchInterviewData = useCallback(async () => {
    if (!applicant) return;
    
    try {
      setLoading(true);
      console.log('🔍 면접 데이터 로딩 시작:', applicant.application_id);
      console.log('📋 지원자 정보:', {
        id: applicant.application_id,
        name: applicant.name,
        status: applicant.interview_status,
        score: applicant.ai_interview_score
      });
      
      // 면접 평가 결과, STT 결과, 동영상 정보, 질문 데이터 등을 가져오기
      const [evaluationRes, sttRes, videoRes, questionsRes] = await Promise.allSettled([
        api.get(`/interview-evaluation/ai-interview/${applicant.application_id}/detailed`),
        api.get(`/interview-questions/ai-interview/${applicant.application_id}/stt-results`),
        api.get(`/interview-questions/ai-interview/${applicant.application_id}/video-info`),
        api.get(`/ai-interview/ai-interview/${applicant.application_id}/questions-with-answers`)
      ]);

      console.log('📡 API 응답 결과:', {
        evaluation: {
          status: evaluationRes.status,
          fulfilled: evaluationRes.status === 'fulfilled',
          value: evaluationRes.status === 'fulfilled' ? evaluationRes.value : null,
          reason: evaluationRes.status === 'rejected' ? evaluationRes.reason : null
        },
        stt: {
          status: sttRes.status,
          fulfilled: sttRes.status === 'fulfilled',
          value: sttRes.status === 'fulfilled' ? sttRes.value : null,
          reason: sttRes.status === 'rejected' ? sttRes.reason : null
        },
        video: {
          status: videoRes.status,
          fulfilled: videoRes.status === 'fulfilled',
          value: videoRes.status === 'fulfilled' ? videoRes.value : null,
          reason: videoRes.status === 'rejected' ? videoRes.reason : null
        },
        questions: {
          status: questionsRes.status,
          fulfilled: questionsRes.status === 'fulfilled',
          value: questionsRes.status === 'fulfilled' ? questionsRes.value : null,
          reason: questionsRes.status === 'rejected' ? questionsRes.reason : null
        }
      });

      // 상세한 응답 데이터 로깅
      if (evaluationRes.status === 'fulfilled') {
        console.log('✅ 평가 API 응답 상세:', {
          status: evaluationRes.value.status,
          data: evaluationRes.value.data,
          evaluation: evaluationRes.value.data?.evaluation,
          evaluationItems: evaluationRes.value.data?.evaluation_items
        });
      } else {
        console.error('❌ 평가 API 실패:', evaluationRes.reason);
      }

      const data = {
        evaluation: evaluationRes.status === 'fulfilled' ? evaluationRes.value.data?.evaluation : null,
        evaluationItems: evaluationRes.status === 'fulfilled' ? evaluationRes.value.data?.evaluation_items || [] : [],
        sttResults: sttRes.status === 'fulfilled' ? sttRes.value.data?.stt_results || [] : [],
        videoInfo: videoRes.status === 'fulfilled' ? videoRes.value.data : null,
        questionsWithAnswers: questionsRes.status === 'fulfilled' ? questionsRes.value.data?.questions_with_answers || [] : []
      };

      console.log('🎯 최종 처리된 데이터:', {
        evaluation: data.evaluation,
        evaluationItemsCount: data.evaluationItems.length,
        sttResultsCount: data.sttResults.length,
        videoInfo: data.videoInfo,
        questionsWithAnswersCount: data.questionsWithAnswers.length
      });
      
      setInterviewData(data);
    } catch (error) {
      console.error('💥 면접 데이터 로드 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  }, [applicant]);

  useEffect(() => {
    fetchInterviewData();
  }, [fetchInterviewData]);

  // 성능 최적화: 비디오 관련 핸들러들을 useCallback으로 최적화
  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleVideoLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // 성능 최적화: 시간 포맷팅을 useMemo로 최적화
  const formatTime = useMemo(() => (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // 성능 최적화: 탭 변경 핸들러를 useCallback으로 최적화
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // 성능 최적화: 비디오 URL 처리 함수
  const processVideoUrl = useCallback(async (url, applicationId) => {
    if (!url) return null;
    
    try {
      console.log('🔍 동영상 URL 처리 시작:', url);
      
      // Google Drive URL 처리
      if (url.includes('drive.google.com')) {
        const { processVideoUrl } = await import('../../utils/googleDrive');
        const processedUrl = await processVideoUrl(url);
        
        if (processedUrl) {
          console.log('✅ Google Drive URL 변환 성공:', processedUrl);
          return processedUrl;
        } else {
          console.warn('⚠️ Google Drive URL 변환 실패, 임시 저장 시도');
          
          // 임시 저장 시도
          const { downloadAndCacheVideo } = await import('../../utils/googleDrive');
          const cachedUrl = await downloadAndCacheVideo(url, applicationId);
          
          if (cachedUrl) {
            console.log('✅ 동영상 임시 저장 성공:', cachedUrl);
            return cachedUrl;
          }
        }
      }
      
      // 일반 URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log('✅ 일반 URL 사용:', url);
        return url;
      }
      
      console.error('❌ 지원하지 않는 URL 형식:', url);
      return null;
      
    } catch (error) {
      console.error('❌ 동영상 URL 처리 오류:', error);
      return null;
    }
  }, []);

  // 성능 최적화: 비디오 로딩 상태 관리
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);

  // 성능 최적화: 비디오 로드 함수
  const loadVideo = useCallback(async (videoUrl, applicationId) => {
    if (!videoUrl) return;
    
    setVideoLoading(true);
    setVideoError(null);
    
    try {
      console.log('🎥 비디오 로딩 시작:', videoUrl);
      
      const processedUrl = await processVideoUrl(videoUrl, applicationId);
      if (!processedUrl) {
        throw new Error('비디오 URL 처리 실패');
      }
      
      setProcessedVideoUrl(processedUrl);
      console.log('✅ 비디오 URL 처리 완료:', processedUrl);
      
    } catch (error) {
      console.error('❌ 비디오 로딩 실패:', error);
      setVideoError(error.message);
    } finally {
      setVideoLoading(false);
    }
  }, [processVideoUrl]);

  useEffect(() => {
    const loadVideoEffect = async () => {
      if (!applicant?.application_id) return;
      
      setVideoLoading(true);
      
      try {
        // 1. 먼저 로컬 비디오 파일 자동 검색
        console.log('🔍 로컬 비디오 자동 검색 시작:', applicant.application_id);
        const localVideoRes = await api.get(`/ai-interview/local-video/${applicant.application_id}`);
        
        if (localVideoRes.data.success && localVideoRes.data.video) {
          // 로컬 비디오 파일 발견
          setProcessedVideoUrl(localVideoRes.data.video.url);
          console.log('✅ 로컬 비디오 자동 로드 완료:', localVideoRes.data.video.filename);
          setVideoLoading(false);
          return;
        } else {
          console.log('⚠️ 로컬 비디오 파일 없음:', localVideoRes.data.message);
        }
        
        // 2. 로컬 비디오가 없으면 기존 비디오 URL 처리
        if (interviewData?.videoInfo?.video_url) {
          console.log('🔍 기존 비디오 URL 처리 시작');
          await loadVideo(interviewData.videoInfo.video_url, applicant.application_id);
          console.log('✅ 기존 비디오 URL 처리 완료:', processedVideoUrl);
        } else {
          console.log('❌ 사용 가능한 비디오가 없습니다');
          setProcessedVideoUrl(null);
        }
        
      } catch (error) {
        console.error('❌ 비디오 로딩 실패:', error);
        setProcessedVideoUrl(null);
      } finally {
        setVideoLoading(false);
      }
    };
    
    loadVideoEffect();
  }, [applicant?.application_id, interviewData?.videoInfo?.video_url, loadVideo]);

  const handleLocalVideoSelect = (video) => {
    setProcessedVideoUrl(video.url);
    console.log('로컬 비디오 선택됨:', video);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">AI 면접 결과</h2>
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200 mb-4">
          {['video', 'stt', 'whisper', 'analysis'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'video' && <FiVideo className="inline w-4 h-4 mr-2" />}
              {tab === 'stt' && <FiMessageSquare className="inline w-4 h-4 mr-2" />}
              {tab === 'whisper' && <FiMic className="inline w-4 h-4 mr-2" />}
              {tab === 'analysis' && <FiBarChart2 className="inline w-4 h-4 mr-2" />}
              {tab === 'stt' ? 'Q&A' : tab}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'video' && (
          <div>
            {/* 자동 비디오 로드 상태 표시 */}
            {processedVideoUrl && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-700">
                    자동 로드된 비디오: {processedVideoUrl.includes('drive.google.com/uc') || processedVideoUrl.includes('drive.google.com/file/d/') ? extractVideoIdFromUrl(processedVideoUrl) : processedVideoUrl.split('/').pop()}
                  </span>
                </div>
              </div>
            )}
            
            {videoLoading ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500 mb-2">동영상을 로딩 중입니다...</p>
                <p className="text-xs text-gray-400">
                  {processedVideoUrl ? '로컬 비디오 파일을 로딩하는 중' : 'Google Drive에서 동영상을 가져오는 중'}
                </p>
              </div>
            ) : processedVideoUrl ? (
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  src={processedVideoUrl}
                  className="w-full h-64 object-contain"
                  controls
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onError={(e) => {
                    console.error('비디오 로드 오류:', e);
                    console.error('비디오 URL:', processedVideoUrl);
                  }}
                  onLoadStart={() => console.log('🎥 동영상 로딩 시작')}
                  onCanPlay={() => console.log('✅ 동영상 재생 준비 완료')}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                  <div className="flex items-center justify-between text-white text-sm">
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                    <button
                      onClick={togglePlay}
                      className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                    >
                      {isPlaying ? <MdOutlinePause /> : <MdOutlinePlayArrow />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">동영상을 불러올 수 없습니다.</p>
                <p className="text-xs text-gray-400 mb-4">
                  지원자 ID {applicant?.application_id}에 해당하는 비디오 파일이 없습니다.
                </p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• 로컬 비디오 파일: interview_{applicant?.application_id}.mp4</p>
                  <p>• Google Drive URL: {interviewData?.videoInfo?.video_url || 'N/A'}</p>
                  <button 
                    onClick={() => {
                      console.log('🔄 동영상 다시 로드 시도');
                      setProcessedVideoUrl(null);
                      setVideoLoading(true);
                      // 비디오 로드 로직 다시 실행
                      const loadVideo = async () => {
                        try {
                          const localVideoRes = await api.get(`/ai-interview/local-video/${applicant.application_id}`);
                          if (localVideoRes.data.success && localVideoRes.data.video) {
                            setProcessedVideoUrl(localVideoRes.data.video.url);
                          } else if (interviewData?.videoInfo?.video_url) {
                            await loadVideo(interviewData.videoInfo.video_url, applicant.application_id);
                          }
                        } catch (error) {
                          console.error('❌ 비디오 재로드 실패:', error);
                        } finally {
                          setVideoLoading(false);
                        }
                      };
                      loadVideo();
                    }}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    다시 시도
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stt' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">면접 질문 & 답변</h3>
              {interviewData?.questionsWithAnswers && (
                <div className="text-sm text-gray-500">
                  총 {interviewData.questionsWithAnswers.length}개 질문
                </div>
              )}
            </div>
            
            {interviewData?.questionsWithAnswers && interviewData.questionsWithAnswers.length > 0 ? (
              <div className="space-y-4">
                {interviewData.questionsWithAnswers.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-blue-600">질문 {item.order}</h4>
                        <div className="flex items-center space-x-2">
                          {item.category && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {item.category}
                            </span>
                          )}
                          {item.difficulty && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                              {item.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-900 text-sm leading-relaxed">{item.question_text}</p>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-green-600 mb-2">답변</h4>
                      {item.answer.text ? (
                        <div>
                          <p className="text-gray-900 text-sm leading-relaxed mb-3">{item.answer.text}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {item.answer.score !== null && (
                              <span>점수: {item.answer.score}/10</span>
                            )}
                            {item.answer.timestamp && (
                              <span>답변 시간: {new Date(item.answer.timestamp).toLocaleString('ko-KR')}</span>
                            )}
                          </div>
                          {item.answer.feedback && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-xs text-yellow-800">피드백: {item.answer.feedback}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm italic">답변이 없습니다.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : interviewData?.sttResults && interviewData.sttResults.length > 0 ? (
              // 기존 STT 결과가 있는 경우 (fallback)
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    질문 데이터는 없지만 STT 결과가 있습니다. 기존 STT 결과를 표시합니다.
                  </p>
                </div>
                {interviewData.sttResults.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="mb-3">
                      <h4 className="font-medium text-blue-600">질문 {index + 1}</h4>
                      <p className="text-gray-900">{item.question}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-600">답변</h4>
                      <p className="text-gray-900">{item.answer}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <span>점수: {item.score || 'N/A'}</span>
                        {item.feedback && (
                          <span className="ml-4">피드백: {item.feedback}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500">면접 질문과 답변이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">
                  interview_question 테이블에서 질문 데이터를 확인해주세요.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'whisper' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">STT 분석 결과</h3>
              <div className="text-sm text-gray-500">
                Whisper STT 기반 음성 분석
              </div>
            </div>
            <WhisperAnalysisDisplay 
              applicationId={applicant.application_id}
              onAnalysisLoad={(whisperData) => {
                console.log('위스퍼 분석 데이터 로드됨:', whisperData);
              }}
            />
          </div>
        )}

        {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">영상 분석 결과</h3>
            <button 
              onClick={async () => {
                try {
                  const response = await api.get(`/ai-interview/video-analysis/${applicant.application_id}`);
                  if (response.data.success) {
                    console.log('영상 분석 결과:', response.data);
                    // 영상 분석 결과를 상태에 저장
                    setInterviewData(prev => ({
                      ...prev,
                      videoAnalysis: response.data.video_analysis,
                      videoAnalysisSource: response.data.data_source
                    }));
                  } else {
                    console.error('영상 분석 결과 로드 실패:', response.data.message);
                  }
                } catch (error) {
                  console.error('영상 분석 결과 로드 실패:', error);
                }
              }}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <MdOutlineAutoAwesome className="w-4 h-4 mr-2" />
              영상 분석 결과 로드
            </button>
          </div>
          
          {/* 데이터 소스 표시 */}
          {interviewData?.videoAnalysisSource && (
            <div className={`p-3 rounded-lg ${
              interviewData.videoAnalysisSource === 'json_file' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  interviewData.videoAnalysisSource === 'json_file' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <span className={`text-sm ${
                  interviewData.videoAnalysisSource === 'json_file' ? 'text-green-700' : 'text-blue-700'
                }`}>
                  데이터 소스: {interviewData.videoAnalysisSource === 'json_file' ? 'JSON 파일' : '데이터베이스'}
                </span>
              </div>
            </div>
          )}
          
          {(interviewData?.evaluation || interviewData?.videoAnalysis) ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 종합 점수 */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaBrain className="text-green-600" />
                    종합 평가
                  </h4>
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {(interviewData.videoAnalysis?.score || interviewData.evaluation?.total_score) || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {(interviewData.videoAnalysis?.score || interviewData.evaluation?.total_score) >= 3.5 ? '✅ 합격' : '❌ 불합격'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(interviewData.videoAnalysis?.timestamp || interviewData.evaluation?.timestamp) ? 
                      `분석 시간: ${new Date(interviewData.videoAnalysis?.timestamp || interviewData.evaluation?.timestamp).toLocaleString()}` : 
                      '분석 시간: N/A'
                    }
                  </div>
                </div>

                {/* 면접 지표 */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiTarget className="text-blue-600" />
                    면접 지표
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">총 길이</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.total_duration || interviewData.evaluation?.total_duration) ? `${(interviewData.videoAnalysis?.total_duration || interviewData.evaluation?.total_duration).toFixed(1)}초` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">발화 시간</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.speaking_time || interviewData.evaluation?.speaking_time) ? `${(interviewData.videoAnalysis?.speaking_time || interviewData.evaluation?.speaking_time).toFixed(1)}초` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">침묵 비율</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.silence_ratio || interviewData.evaluation?.silence_ratio) ? `${((interviewData.videoAnalysis?.silence_ratio || interviewData.evaluation?.silence_ratio) * 100).toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">분당 발화 속도</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.speaking_speed_wpm || interviewData.evaluation?.speaking_speed_wpm) ? `${interviewData.videoAnalysis?.speaking_speed_wpm || interviewData.evaluation?.speaking_speed_wpm}단어` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* 음성 특성 */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MdOutlineVolumeUp className="text-purple-600" />
                    음성 특성
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">평균 에너지</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.avg_energy || interviewData.evaluation?.avg_energy) ? (interviewData.videoAnalysis?.avg_energy || interviewData.evaluation?.avg_energy).toFixed(4) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">평균 피치</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.avg_pitch || interviewData.evaluation?.avg_pitch) ? `${(interviewData.videoAnalysis?.avg_pitch || interviewData.evaluation?.avg_pitch).toFixed(1)}Hz` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">세그먼트 수</span>
                      <span className="font-medium">{interviewData.videoAnalysis?.segment_count || interviewData.evaluation?.segment_count || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">평균 세그먼트</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.avg_segment_duration || interviewData.evaluation?.avg_segment_duration) ? `${(interviewData.videoAnalysis?.avg_segment_duration || interviewData.evaluation?.avg_segment_duration).toFixed(2)}초` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* 감정 & 태도 */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaSmile className="text-yellow-600" />
                    감정 & 태도
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">감정</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (interviewData.videoAnalysis?.emotion || interviewData.evaluation?.emotion) === '긍정적' ? 'bg-green-100 text-green-800' :
                        (interviewData.videoAnalysis?.emotion || interviewData.evaluation?.emotion) === '부정적' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {interviewData.videoAnalysis?.emotion || interviewData.evaluation?.emotion || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">태도</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (interviewData.videoAnalysis?.attitude || interviewData.evaluation?.attitude) === '적극적' ? 'bg-blue-100 text-blue-800' :
                        (interviewData.videoAnalysis?.attitude || interviewData.evaluation?.attitude) === '소극적' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {interviewData.videoAnalysis?.attitude || interviewData.evaluation?.attitude || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">자세</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (interviewData.videoAnalysis?.posture || interviewData.evaluation?.posture) === '좋음' ? 'bg-green-100 text-green-800' :
                        (interviewData.videoAnalysis?.posture || interviewData.evaluation?.posture) === '나쁨' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {interviewData.videoAnalysis?.posture || interviewData.evaluation?.posture || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 세부 평가 항목 */}
            <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiList className="text-purple-600" />
                  세부 평가 항목
                </h4>
                {applicant && (
                  <InterviewEvaluationItems
                    resumeId={applicant.resume_id}
                    applicationId={applicant.application_id}
                    interviewStage="ai_interview"
                    onScoreChange={(scores) => {
                      console.log('평가 점수 변경:', scores);
                    }}
                  />
                )}
            </div>

            {/* AI 피드백 */}
            {(interviewData.videoAnalysis?.feedback || interviewData.evaluation?.feedback) && (
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MdOutlinePsychology className="text-blue-600" />
                  AI 피드백
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {interviewData.videoAnalysis?.feedback || interviewData.evaluation?.feedback}
                </p>
              </div>
            )}
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500 text-lg mb-2">분석 결과가 없습니다</p>
              <p className="text-gray-400 text-sm">AI 분석이 완료되지 않았거나 데이터를 불러올 수 없습니다</p>
              <div className="mt-4">
                <button 
                  onClick={async () => {
                    try {
                      const response = await api.get(`/ai-interview/video-analysis/${applicant.application_id}`);
                      if (response.data.success) {
                        console.log('영상 분석 결과:', response.data);
                        setInterviewData(prev => ({
                          ...prev,
                          videoAnalysis: response.data.video_analysis,
                          videoAnalysisSource: response.data.data_source
                        }));
                      } else {
                        console.error('영상 분석 결과 로드 실패:', response.data.message);
                      }
                    } catch (error) {
                      console.error('영상 분석 결과 로드 실패:', error);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  영상 분석 결과 다시 로드
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
});

InterviewResultDetail.displayName = 'InterviewResultDetail';

// 성능 최적화: 설정 모달 컴포넌트를 메모이제이션
const SettingsModal = React.memo(({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // 성능 최적화: 설정 변경 핸들러를 useCallback으로 최적화
  const handleSettingChange = useCallback((key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleSave = useCallback(async () => {
    await onSave(localSettings);
    onClose();
  }, [localSettings, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">AI 면접 설정</h2>
        
  <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              질문 수
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={localSettings.questionCount || 5}
              onChange={(e) => handleSettingChange('questionCount', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              면접 시간 (분)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={localSettings.timeLimit || 15}
              onChange={(e) => handleSettingChange('timeLimit', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
        </div>
      </div>
        
        {/* 버튼 */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
          >
            설정 저장
          </button>
  </div>
      </div>
    </div>
  );
});

SettingsModal.displayName = 'SettingsModal';

// 성능 최적화: 메인 컴포넌트를 React.memo로 래핑
const AiInterviewSystem = React.memo(() => {
  const { jobPostId, applicantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 성능 최적화: 상태 그룹화 및 초기화 최적화
  const [state, setState] = useState({
    // 로딩 상태
    loading: true,
    isInitialLoad: true,
    loadingProgress: 0,
    
    // 데이터 상태
    applicant: null,
    jobPost: null,
    applicantsList: [],
    selectedApplicantId: null,
    userSelectedApplicant: false,
    
    // UI 상태
    showApplicantInfo: false,
    selectedApplicantForInfo: null,
    showSettings: false,
    
    // 성능 최적화 상태
    virtualizedApplicants: [],
    pageSize: 20,
    currentPage: 0,
    lazyLoadEnabled: true,
    preloadThreshold: 3
  });

  // 성능 최적화: 캐시 상태
  const [cache, setCache] = useState({
    applicantsCache: new Map(),
    jobPostCache: new Map(),
    questionsCache: new Map(),
    evaluationCache: new Map()
  });

  // 성능 최적화: refs
  const performanceStartTime = useRef(performance.now());
  const requestIdRef = useRef(null);

  // 성능 최적화: 상태 업데이트 함수
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 성능 최적화: 캐시 업데이트 함수
  const updateCache = useCallback((cacheKey, key, value) => {
    setCache(prev => ({
      ...prev,
      [cacheKey]: new Map(prev[cacheKey]).set(key, value)
    }));
  }, []);

  // 성능 최적화: 디바운스된 API 호출
  const debouncedApiCall = useCallback((apiFunction, delay = 300) => {
    if (requestIdRef.current) {
      clearTimeout(requestIdRef.current);
    }
    
    return new Promise((resolve) => {
      requestIdRef.current = setTimeout(async () => {
        try {
          const result = await apiFunction();
          resolve(result);
        } catch (error) {
          console.error('API 호출 실패:', error);
          resolve(null);
        }
      }, delay);
    });
  }, []);

  // 성능 최적화: 가상화된 목록 처리
  const processVirtualizedList = useCallback((applicants, page = 0, size = 20) => {
    const start = page * size;
    const end = start + size;
    return applicants.slice(start, end);
  }, []);

  // 성능 최적화: 메모리 정리
  const cleanupMemory = useCallback(() => {
    if (cache.applicantsCache.size > 50) {
      const newCache = new Map();
      let count = 0;
      for (const [key, value] of cache.applicantsCache.entries()) {
        if (count < 25) {
          newCache.set(key, value);
          count++;
        }
      }
      setCache(prev => ({ ...prev, applicantsCache: newCache }));
    }
  }, [cache.applicantsCache.size]);

  // 성능 최적화: 지연 로딩
  const handleLazyLoad = useCallback((index) => {
    if (state.lazyLoadEnabled && index >= state.currentPage * state.pageSize - state.preloadThreshold) {
      updateState({ currentPage: state.currentPage + 1 });
    }
  }, [state.lazyLoadEnabled, state.currentPage, state.pageSize, state.preloadThreshold, updateState]);

  // 성능 최적화: 컴포넌트 마운트 시 정리
  useEffect(() => {
    performanceStartTime.current = performance.now();
    
    return () => {
      const loadTime = performance.now() - performanceStartTime.current;
      console.log(`📊 AiInterviewSystem 로딩 시간: ${loadTime.toFixed(2)}ms`);
      
      if (requestIdRef.current) {
        clearTimeout(requestIdRef.current);
      }
      
      cleanupMemory();
    };
  }, [cleanupMemory]);

  // 성능 최적화: 1단계 - 지원자 목록 우선 로딩
  useEffect(() => {
    const fetchApplicantsList = async () => {
      if (!jobPostId) return;
      
      updateState({ loading: true, loadingProgress: 0 });
      
      try {
        console.log('🚀 AI 면접 지원자 목록 로딩 시작');
        
        // 캐시 확인
        if (cache.jobPostCache.has(jobPostId)) {
          updateState({ 
            jobPost: cache.jobPostCache.get(jobPostId),
            loadingProgress: 30 
          });
        } else {
          // 1. 공고 정보 로드
          updateState({ loadingProgress: 30 });
          const jobPostRes = await api.get(`/company/jobposts/${jobPostId}`);
          updateState({ jobPost: jobPostRes.data });
          updateCache('jobPostCache', jobPostId, jobPostRes.data);
        }
        
        // 캐시 확인
        if (cache.applicantsCache.has(jobPostId)) {
          const cachedApplicants = cache.applicantsCache.get(jobPostId);
          
          // 캐시된 데이터에도 필터링 적용
          const filteredCachedApplicants = cachedApplicants.filter(applicant => {
            const status = applicant.interview_status;
            // AI 면접이 완료된 지원자만 표시
            return status === 'AI_INTERVIEW_COMPLETED' || 
                   status === 'AI_INTERVIEW_PASSED' || 
                   status === 'AI_INTERVIEW_FAILED' ||
                   (status && (
                     status.startsWith('FIRST_INTERVIEW_') || 
                     status.startsWith('SECOND_INTERVIEW_') || 
                     status.startsWith('FINAL_INTERVIEW_')
                   ));
          });
          
          updateState({ 
            applicantsList: filteredCachedApplicants,
            loadingProgress: 100,
            isInitialLoad: false 
          });
          console.log('✅ 지원자 목록 캐시에서 로드 (필터링됨):', filteredCachedApplicants.length, '명');
        } else {
          // 2. 지원자 목록 로드
          updateState({ loadingProgress: 60 });
          const applicantsRes = await api.get(`/applications/job/${jobPostId}/ai-interview-applicants-basic`);
          const applicants = applicantsRes.data.applicants || [];
          
          // interview_status에 따라 필터링 (AI 면접 완료된 지원자만 표시)
          const filteredApplicants = applicants.filter(applicant => {
            const status = applicant.interview_status;
            // AI 면접이 완료된 지원자만 표시
            return status === 'AI_INTERVIEW_COMPLETED' || 
                   status === 'AI_INTERVIEW_PASSED' || 
                   status === 'AI_INTERVIEW_FAILED' ||
                   (status && (
                     status.startsWith('FIRST_INTERVIEW_') || 
                     status.startsWith('SECOND_INTERVIEW_') || 
                     status.startsWith('FINAL_INTERVIEW_')
                   ));
          });
          
          // 점수 기준 내림차순 정렬
          const sortedApplicants = filteredApplicants.sort((a, b) => {
            const scoreA = a.ai_interview_score || 0;
            const scoreB = b.ai_interview_score || 0;
            return scoreB - scoreA;
          });
          
          updateState({ 
            applicantsList: sortedApplicants,
            loadingProgress: 100,
            isInitialLoad: false 
          });
          updateCache('applicantsCache', jobPostId, sortedApplicants);
          console.log('✅ 지원자 목록 API에서 로드 및 정렬:', sortedApplicants.length, '명');
        }
        
        console.log('🎉 지원자 목록 로딩 완료');
        
      } catch (error) {
        console.error('지원자 목록 로드 실패:', error);
        updateState({ isInitialLoad: false });
      } finally {
        updateState({ loading: false });
      }
    };
    
    fetchApplicantsList();
  }, [jobPostId, cache.jobPostCache, cache.applicantsCache, updateState, updateCache]);

  // 성능 최적화: 메모이제이션된 함수들
  const handleApplicantSelect = useCallback((applicant) => {
    updateState({
      selectedApplicantId: applicant.application_id,
      userSelectedApplicant: true
    });
  }, [updateState]);

  const handleApplicantInfoClick = useCallback((applicant) => {
    updateState({
      showApplicantInfo: true,
      selectedApplicantForInfo: applicant
    });
  }, [updateState]);

  const handleCloseApplicantInfo = useCallback(() => {
    updateState({
      showApplicantInfo: false,
      selectedApplicantForInfo: null
    });
  }, [updateState]);

  const handleBackToList = useCallback(() => {
    updateState({
      selectedApplicantId: null,
      userSelectedApplicant: false
    });
  }, [updateState]);

  // 성능 최적화: 메모이제이션된 계산값들
  const selectedApplicant = useMemo(() => {
    return state.applicantsList.find(a => a.application_id === state.selectedApplicantId);
  }, [state.applicantsList, state.selectedApplicantId]);

  const passedCount = useMemo(() => {
    return state.applicantsList.filter(a => {
      const status = a.interview_status;
      
      // AI_INTERVIEW_PASSED 또는 다음 단계 면접으로 넘어간 경우
      return status === 'AI_INTERVIEW_PASSED' || 
             (status && (
               status.startsWith('FIRST_INTERVIEW_') || 
               status.startsWith('SECOND_INTERVIEW_') || 
               status.startsWith('FINAL_INTERVIEW_')
             ));
    }).length;
  }, [state.applicantsList]);

  const failedCount = useMemo(() => {
    return state.applicantsList.filter(a => {
      const status = a.interview_status;
      
      // AI_INTERVIEW_FAILED만 불합격으로 카운트
      return status === 'AI_INTERVIEW_FAILED';
    }).length;
  }, [state.applicantsList]);

  const pendingCount = useMemo(() => {
    return state.applicantsList.filter(a => {
      const status = a.interview_status;
      
      // 합격이나 불합격이 아닌 모든 상태 (AI 면접 진행 중이거나 대기 중)
      return status !== 'AI_INTERVIEW_PASSED' && 
             status !== 'AI_INTERVIEW_FAILED' &&
             !(status && (
               status.startsWith('FIRST_INTERVIEW_') || 
               status.startsWith('SECOND_INTERVIEW_') || 
               status.startsWith('FINAL_INTERVIEW_')
             ));
    }).length;
  }, [state.applicantsList]);

  // 성능 최적화: 가상화된 지원자 목록
  const virtualizedApplicants = useMemo(() => {
    return processVirtualizedList(state.applicantsList, state.currentPage, state.pageSize);
  }, [state.applicantsList, state.currentPage, state.pageSize, processVirtualizedList]);

  // 성능 최적화: 로딩 상태 체크
  if (state.loading || state.isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">AI 면접 지원자 목록 로딩 중...</p>
          <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${state.loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{state.loadingProgress}% 완료</p>
          <div className="text-xs text-gray-400 mt-4">
            {state.loadingProgress < 30 && "공고 정보 로딩 중..."}
            {state.loadingProgress >= 30 && state.loadingProgress < 70 && "지원자 목록 준비 중..."}
            {state.loadingProgress >= 70 && "완료 준비 중..."}
          </div>
          <div className="text-xs text-blue-500 mt-2">
            💡 면접 결과를 확인할 수 있습니다
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navbar />}
      <ViewPostSidebar jobPost={state.jobPost} />
      
      {/* AI 면접 헤더 */}
      <div className="fixed top-16 left-90 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <MdOutlineAutoAwesome />
              AI 면접 결과 시스템
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {!state.selectedApplicantId ? '서류합격자 AI 면접 결과 조회' : '면접 동영상 및 분석 결과 확인'}
            </p>
          </div>
          
          {/* 성능 최적화: 캐시 새로고침 버튼 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => updateState({ showSettings: true })}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <FiSettings className="w-4 h-4" />
              AI 면접 설정
            </button>
            <button
              onClick={() => {
                setCache({
                  applicantsCache: new Map(),
                  jobPostCache: new Map(),
                  questionsCache: new Map(),
                  evaluationCache: new Map()
                });
                window.location.reload();
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              캐시 새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="pt-32 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          {!state.selectedApplicantId ? (
            // 지원자 목록 화면
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 지원자 목록 */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      AI 면접 대상자 ({state.applicantsList.length}명)
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FiUsers className="w-4 h-4" />
                      서류합격자
                    </div>
                  </div>
                  
                  {/* 성능 최적화: 가상화된 목록 */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {virtualizedApplicants.map((applicant, index) => (
                      <MemoizedApplicantCard
                        key={applicant.application_id}
                        applicant={applicant}
                        isSelected={state.selectedApplicantId === applicant.application_id}
                        onClick={handleApplicantSelect}
                        onInfoClick={handleApplicantInfoClick}
                      />
                    ))}
                  </div>
                  
                  {/* 성능 최적화: 페이지네이션 */}
                  {state.applicantsList.length > state.pageSize && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => updateState({ currentPage: Math.max(0, state.currentPage - 1) })}
                        disabled={state.currentPage === 0}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                      >
                        이전
                      </button>
                      <span className="px-3 py-1 text-sm">
                        {state.currentPage + 1} / {Math.ceil(state.applicantsList.length / state.pageSize)}
                      </span>
                      <button
                        onClick={() => updateState({ currentPage: state.currentPage + 1 })}
                        disabled={state.currentPage >= Math.ceil(state.applicantsList.length / state.pageSize) - 1}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 통계 정보 */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">면접 통계</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">총 지원자</span>
                      <span className="font-semibold">{state.applicantsList.length}명</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600">합격</span>
                      <span className="font-semibold text-green-600">
                        {passedCount}명
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600">불합격</span>
                      <span className="font-semibold text-red-600">
                        {failedCount}명
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">미완료</span>
                      <span className="font-semibold text-gray-600">
                        {pendingCount}명
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 면접 결과 상세 화면
            <InterviewResultDetail 
              applicant={selectedApplicant}
              onBack={handleBackToList}
            />
          )}
        </div>
      </div>

      {/* AI 면접 설정 모달 */}
      <SettingsModal
        isOpen={state.showSettings}
        onClose={() => updateState({ showSettings: false })}
        settings={{
          questionCount: state.jobPost?.ai_interview_settings?.question_count || 10,
          timeLimit: state.jobPost?.ai_interview_settings?.interview_duration || 30
        }}
        onSave={async (settings) => {
          console.log('AI 면접 설정 저장됨:', settings);
          try {
            await api.post(`/ai-interview/settings/${jobPostId}`, settings);
            updateState({ showSettings: false });
            // 설정 변경 후 면접 목록 다시 로드
            updateCache('applicantsCache', jobPostId, []); // 캐시 비우기
            updateState({ applicantsList: [], loading: true }); // 로딩 상태로 변경
            await fetchApplicantsList(); // 목록 다시 로드
          } catch (error) {
            console.error('설정 저장 실패:', error);
          }
        }}
      />

      {/* 지원자 정보 모달 */}
      {state.showApplicantInfo && state.selectedApplicantForInfo && (
        <ApplicantInfoModal
          isOpen={state.showApplicantInfo}
          onClose={handleCloseApplicantInfo}
          applicant={state.selectedApplicantForInfo}
          jobPostId={jobPostId}
        />
      )}
    </div>
  );
});

AiInterviewSystem.displayName = 'AiInterviewSystem';

export default AiInterviewSystem;