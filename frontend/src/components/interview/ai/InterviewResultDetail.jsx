import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBrain, FaSmile, FaArrowLeft, FaSync
} from 'react-icons/fa';
import { 
  FiTarget, FiUser
} from 'react-icons/fi';
import { 
  MdOutlineVolumeUp, MdOutlinePsychology, 
  MdOutlineAutoAwesome, MdOutlineVideoLibrary,
  MdOutlineAnalytics, MdOutlineRecordVoiceOver
} from 'react-icons/md';

import api from '../../../api/api';
import QuestionVideoAnalysisModal from '../../common/QuestionVideoAnalysisModal';
import DetailedWhisperAnalysis from '../../common/DetailedWhisperAnalysis';
import AudioRecorder from '../../common/AudioRecorder';
import AudioUploader from '../../common/AudioUploader';

// 성능 최적화: 면접 결과 상세 컴포넌트를 메모이제이션
const InterviewResultDetail = React.memo(({ applicant, onBack }) => {
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [aiInterviewVideoUrl, setAiInterviewVideoUrl] = useState('');
  const [aiInterviewVideoLoading, setAiInterviewVideoLoading] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [openStt, setOpenStt] = useState(false);
  const [openWhisper, setOpenWhisper] = useState(false);
  const [openQuestion, setOpenQuestion] = useState(false);
  const [openQa, setOpenQa] = useState(false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [reAnalysisTarget, setReAnalysisTarget] = useState(null);
  const [showQuestionAnalysisModal, setShowQuestionAnalysisModal] = useState(false);
  const [showDetailedWhisperAnalysis, setShowDetailedWhisperAnalysis] = useState(false);
  
  // navigate hook 추가
  const navigate = useNavigate();

  // 성능 최적화: 탭 변경 핸들러를 useCallback으로 최적화
  const handleTabChange = useCallback((tab) => {
    // 녹음 탭을 선택했는데 지원자가 선택되지 않은 경우 안내
    if (tab === 'recording' && !applicant) {
      alert('녹음 기능을 사용하려면 먼저 지원자를 선택해주세요.');
      return;
    }
    setActiveTab(tab);
  }, [applicant]);

  // 재분석 핸들러 추가
  const handleReAnalyze = useCallback(async (applicant) => {
    try {
      setIsReAnalyzing(true);
      setReAnalysisTarget(applicant.application_id);
      
      // 재분석 API 호출 (타임아웃 5분으로 증가)
      const response = await api.post(`/whisper-analysis/process-qa/${applicant.application_id}`, {
        run_emotion_context: true,
        delete_video_after: true
      }, {
        timeout: 300000 // 5분 (300초)
      });
      
      if (response.data.success) {
        alert(`${applicant.name} 지원자의 재분석이 시작되었습니다.\n\n분석이 완료될 때까지 기다려주세요.\n(예상 소요시간: 3-5분)`);
        // 데이터 새로고침
        await loadInterviewData();
      } else {
        alert('재분석 시작에 실패했습니다.');
      }
    } catch (error) {
      console.error('재분석 오류:', error);
      alert('재분석 중 오류가 발생했습니다.');
    } finally {
      setIsReAnalyzing(false);
      setReAnalysisTarget(null);
    }
  }, []);

  // 성능 최적화: AI 분석 생성 핸들러를 useCallback으로 최적화
  const handleGenerateAIAnalysis = useCallback(async () => {
    if (!applicant) return;
    
    setAiAnalysisLoading(true);
    setAiAnalysisError(null);
    
    try {
      const response = await api.post(`/interview-questions/ai-analysis/generate/${applicant.application_id}`);
      if (response.data.success) {
        setAiAnalysisResult(response.data.analysis);
        // 기존 데이터 업데이트
        setInterviewData(prev => ({
          ...prev,
          evaluation: response.data.analysis
        }));
      } else {
        setAiAnalysisError(response.data.message || 'AI 분석 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 분석 생성 오류:', error);
      setAiAnalysisError('AI 분석 생성 중 오류가 발생했습니다.');
    } finally {
      setAiAnalysisLoading(false);
    }
  }, [applicant]);

  // Whisper 분석 상태 폴링 함수
  const startStatusPolling = useCallback(() => {
    if (isPolling) return;
    
    setIsPolling(true);
    console.log('🔄 Whisper 분석 상태 폴링 시작...');
    
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/whisper-analysis/status/${applicant.application_id}`);
        
        if (response.data.has_analysis) {
          console.log('✅ Whisper 분석 완료됨!');
          setIsPolling(false);
          clearInterval(interval);
          
          // 분석 완료 알림
          alert(`Whisper 분석이 완료되었습니다!\n전사 길이: ${response.data.transcription_length}자\n점수: ${response.data.score}점`);
          
          // 데이터 새로고침
          await loadInterviewData();
        }
      } catch (error) {
        console.error('상태 폴링 오류:', error);
      }
    }, 10000); // 10초마다 확인 (부하 감소)
    
    setPollingInterval(interval);
  }, [applicant.application_id, isPolling]);

  // 폴링 중지 함수
  const stopStatusPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsPolling(false);
  }, [pollingInterval]);

  // 컴포넌트 언마운트 시 폴링 중지
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, [stopStatusPolling]);

  // 일반 면접 영상 관련 코드 제거 - AI 면접 동영상만 사용

  // 비디오 로드 효과 (application 정보 포함)
  useEffect(() => {
    const loadVideoEffect = async () => {
      if (!applicant) return;
      
      setVideoLoading(true);
      try {
        // 1. applicant에서 직접 URL 확인 (API에서 application 정보를 포함시킨 경우)
        console.log(`🔍 ${applicant.application_id}번 지원자 데이터 확인:`, applicant);
        console.log(`🔍 ${applicant.application_id}번 지원자 ai_interview_video_url:`, applicant.ai_interview_video_url);
        console.log(`🔍 ${applicant.application_id}번 지원자 video_url:`, applicant.video_url);
        
        // 58, 61, 68번 지원자 특별 로깅
        if ([58, 61, 68].includes(applicant.application_id)) {
          console.log(`🎯 특별 확인 - ${applicant.application_id}번 지원자:`, {
            name: applicant.name,
            application_id: applicant.application_id,
            ai_interview_video_url: applicant.ai_interview_video_url,
            video_url: applicant.video_url,
            has_video: !!(applicant.ai_interview_video_url || applicant.video_url),
            fullData: applicant
          });
          
          // 비디오 URL이 있는지 확인
          if (applicant.ai_interview_video_url || applicant.video_url) {
            console.log(`✅ ${applicant.application_id}번 지원자: 비디오 URL 존재`);
          } else {
            console.log(`❌ ${applicant.application_id}번 지원자: 비디오 URL 없음`);
          }
        }
        
        if (applicant.ai_interview_video_url) {
          // Google Drive URL을 preview 형식으로 변환
          let processedUrl = applicant.ai_interview_video_url;
          if (processedUrl.includes('drive.google.com/file/d/')) {
            const fileId = processedUrl.match(/\/file\/d\/([^\/]+)/)?.[1];
            if (fileId) {
              processedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
              console.log(`🔄 Google Drive URL을 preview 형식으로 변환: ${processedUrl}`);
            }
          }
          setVideoUrl(processedUrl);
          console.log(`✅ ${applicant.application_id}번 지원자 AI 면접 비디오 URL 사용: ${processedUrl}`);
          setVideoLoading(false);
          return;
        }
        
        // 2. applicant에서 기존 비디오 URL 확인
        if (applicant.video_url) {
          setVideoUrl(applicant.video_url);
          console.log(`✅ ${applicant.application_id}번 지원자 기존 비디오 URL 사용: ${applicant.video_url}`);
          setVideoLoading(false);
          return;
        }
        
        // 3. API 호출로 application 정보 조회 (applicant에 application 정보가 없는 경우)
        console.log(`🔍 ${applicant.application_id}번 지원자 application 정보 별도 조회 시도...`);
        try {
          const applicationResponse = await api.get(`/applications/${applicant.application_id}`);
          const applicationData = applicationResponse.data;
          
          console.log(`🔍 Application 데이터:`, applicationData);
          
          if (applicationData.ai_interview_video_url) {
            let processedUrl = applicationData.ai_interview_video_url;
            if (processedUrl.includes('drive.google.com/file/d/')) {
              const fileId = processedUrl.match(/\/file\/d\/([^\/]+)/)?.[1];
              if (fileId) {
                processedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                console.log(`🔄 Google Drive URL을 preview 형식으로 변환: ${processedUrl}`);
              }
            }
            setVideoUrl(processedUrl);
            console.log(`✅ ${applicant.application_id}번 지원자 Application에서 AI 면접 비디오 URL 사용: ${processedUrl}`);
            setVideoLoading(false);
            return;
          }
          
          if (applicationData.video_url) {
            setVideoUrl(applicationData.video_url);
            console.log(`✅ ${applicant.application_id}번 지원자 Application에서 기존 비디오 URL 사용: ${applicationData.video_url}`);
            setVideoLoading(false);
            return;
          }
        } catch (apiError) {
          console.error('Application 정보 조회 실패:', apiError);
        }
        
        // 최종 폴백: 비디오 URL 없음
        console.warn(`⚠️ ${applicant.application_id}번 지원자 비디오 URL 없음`);
      } catch (error) {
        console.error('비디오 로드 오류:', error);
      } finally {
        setVideoLoading(false);
      }
    };

    loadVideoEffect();
    
    // AI 면접 비디오 로드
    const loadAiInterviewVideo = async () => {
      setAiInterviewVideoLoading(true);
      try {
        // 1. applicant에서 직접 URL 확인
        if (applicant.ai_interview_video_url) {
          // Google Drive URL을 preview 형식으로 변환
          let processedUrl = applicant.ai_interview_video_url;
          if (processedUrl.includes('drive.google.com/file/d/')) {
            const fileId = processedUrl.match(/\/file\/d\/([^\/]+)/)?.[1];
            if (fileId) {
              processedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
              console.log(`🔄 Google Drive URL을 preview 형식으로 변환: ${processedUrl}`);
            }
          }
          setAiInterviewVideoUrl(processedUrl);
          console.log(`✅ ${applicant.application_id}번 지원자 AI 면접 비디오 URL 사용: ${processedUrl}`);
          setAiInterviewVideoLoading(false);
          return;
        }
        
        // 2. applicant에서 기존 비디오 URL 확인
        if (applicant.video_url) {
          setAiInterviewVideoUrl(applicant.video_url);
          console.log(`✅ ${applicant.application_id}번 지원자 기존 비디오 URL 사용: ${applicant.video_url}`);
          setAiInterviewVideoLoading(false);
          return;
        }
        
        // 3. API 호출로 application 정보 조회
        console.log(`🔍 ${applicant.application_id}번 지원자 application 정보 별도 조회 시도...`);
        try {
          const applicationResponse = await api.get(`/applications/${applicant.application_id}`);
          const applicationData = applicationResponse.data;
          
          console.log(`🔍 Application 데이터:`, applicationData);
          
          if (applicationData.ai_interview_video_url) {
            let processedUrl = applicationData.ai_interview_video_url;
            if (processedUrl.includes('drive.google.com/file/d/')) {
              const fileId = processedUrl.match(/\/file\/d\/([^\/]+)/)?.[1];
              if (fileId) {
                processedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                console.log(`🔄 Google Drive URL을 preview 형식으로 변환: ${processedUrl}`);
              }
            }
            setAiInterviewVideoUrl(processedUrl);
            console.log(`✅ ${applicant.application_id}번 지원자 Application에서 AI 면접 비디오 URL 사용: ${processedUrl}`);
            setAiInterviewVideoLoading(false);
            return;
          }
          
          if (applicationData.video_url) {
            setAiInterviewVideoUrl(applicationData.video_url);
            console.log(`✅ ${applicant.application_id}번 지원자 Application에서 기존 비디오 URL 사용: ${applicationData.video_url}`);
            setAiInterviewVideoLoading(false);
            return;
          }
        } catch (apiError) {
          console.error('Application 정보 조회 실패:', apiError);
        }
        
        // 4. 폴백: 샘플 비디오 URL 사용
        const fallbackUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        setAiInterviewVideoUrl(fallbackUrl);
        console.log(`⚠️ ${applicant.application_id}번 지원자 비디오 URL 없음, 폴백 URL 사용: ${fallbackUrl}`);
      } catch (error) {
        console.error('AI 면접 비디오 URL 설정 실패:', error);
        // 최종 폴백
        const fallbackUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        setAiInterviewVideoUrl(fallbackUrl);
        console.log(`⚠️ 최종 폴백 URL 사용: ${fallbackUrl}`);
      } finally {
        setAiInterviewVideoLoading(false);
      }
    };

    loadAiInterviewVideo();
  }, [applicant]);

  // 하드코딩된 데이터 완전 제거 - DB에서만 데이터를 가져옴

  // 면접 데이터 로드 함수
  const loadInterviewData = useCallback(async () => {
    if (!applicant) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 ${applicant.application_id}번 지원자 면접 데이터 로드 시작...`);
      
      // AI 면접 분석 결과 로드
      let whisperAnalysisData = null;
      try {
        // 먼저 whisper-analysis 상태 확인
        const statusResponse = await api.get(`/whisper-analysis/status/${applicant.application_id}`);
        if (statusResponse.data.has_analysis) {
          whisperAnalysisData = {
            analysis: {
              transcription: statusResponse.data.transcription,
              score: statusResponse.data.score,
              timestamp: statusResponse.data.created_at,
              total_duration: null,
              speaking_time: null,
              silence_ratio: null,
              speaking_speed_wpm: null,
              avg_energy: null,
              avg_pitch: null,
              segment_count: null,
              avg_segment_duration: null,
              emotion: null,
              attitude: null,
              posture: null,
              feedback: null
            }
          };
          console.log('Whisper 분석 결과:', whisperAnalysisData);
        }
      } catch (whisperError) {
        console.warn('AI 면접 분석 결과 로드 실패:', whisperError);
        // 에러가 발생해도 계속 진행
      }
      
      // Video Analysis 결과 로드
      let videoAnalysisData = null;
      try {
        const videoResponse = await api.get(`/video-analysis/result/${applicant.application_id}`);
        if (videoResponse.data.success) {
          videoAnalysisData = videoResponse.data.analysis;
          console.log('Video Analysis 결과:', videoAnalysisData);
        }
      } catch (videoError) {
        console.warn('Video Analysis 결과 로드 실패:', videoError);
        // 백엔드 DB 컬럼 문제로 인한 500 에러가 발생할 수 있음
        // 에러가 발생해도 계속 진행
      }
      
      // QA 분석 결과 로드
      let qaAnalysisData = null;
      try {
        const qaResponse = await api.get(`/whisper-analysis/qa-analysis/${applicant.application_id}`);
        if (qaResponse.data.success) {
          qaAnalysisData = qaResponse.data.qa_analysis;
          console.log('QA 분석 결과:', qaAnalysisData);
        }
      } catch (qaError) {
        console.warn('QA 분석 결과 로드 실패:', qaError);
        // 에러가 발생해도 계속 진행
      }
      
      // 데이터 통합 (에러가 발생해도 기본 구조 유지)
      const combinedData = {
        whisperAnalysis: whisperAnalysisData,
        videoAnalysis: videoAnalysisData,
        videoAnalysisSource: videoAnalysisData ? 'video-analysis-db' : null,
        qaAnalysis: qaAnalysisData,
        evaluation: null, // 추후 확장 가능
        hasData: !!(whisperAnalysisData || videoAnalysisData || qaAnalysisData)
      };
      
      setInterviewData(combinedData);
      console.log('✅ 면접 데이터 로드 완료:', combinedData);
      
    } catch (error) {
      console.error('면접 데이터 로드 실패:', error);
      // 에러가 발생해도 기본 데이터 구조로 설정
      const fallbackData = {
        whisperAnalysis: null,
        videoAnalysis: null,
        videoAnalysisSource: null,
        qaAnalysis: null,
        evaluation: null,
        hasData: false,
        error: error.message
      };
      setInterviewData(fallbackData);
      setError('일부 데이터를 불러오는 중 오류가 발생했지만, 기본 화면은 표시됩니다.');
    } finally {
      setLoading(false);
    }
  }, [applicant]);

  // 면접 데이터 로드 효과 (DB에서만 데이터를 가져옴)
  useEffect(() => {
    loadInterviewData();
  }, [loadInterviewData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <p className="text-red-600 text-lg mb-2">오류가 발생했습니다</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{applicant.name} - AI 면접 분석 결과</h2>
                  <p className="text-sm text-gray-600">{applicant.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {/* 상태 배지 */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  applicant.interview_status === 'AI_INTERVIEW_PASSED' ? 'bg-green-100 text-green-800' :
                  applicant.interview_status === 'AI_INTERVIEW_FAILED' ? 'bg-red-100 text-red-800' :
                  applicant.interview_status === 'AI_INTERVIEW_COMPLETED' ? 'bg-blue-100 text-blue-800' :
                  applicant.interview_status === 'AI_INTERVIEW_IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {applicant.interview_status === 'AI_INTERVIEW_PASSED' ? '합격' :
                   applicant.interview_status === 'AI_INTERVIEW_FAILED' ? '불합격' :
                   applicant.interview_status === 'AI_INTERVIEW_COMPLETED' ? '완료' :
                   applicant.interview_status === 'AI_INTERVIEW_IN_PROGRESS' ? '진행중' :
                   '대기중'}
                </span>
                
                {/* 재분석 버튼 고정 */}
                <button
                  onClick={() => handleReAnalyze(applicant)}
                  disabled={isReAnalyzing && reAnalysisTarget === applicant.application_id}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 flex items-center gap-2 transition-colors"
                  title="전체 오디오/비디오 세션 재분석"
                >
                  {isReAnalyzing && reAnalysisTarget === applicant.application_id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <FaSync className="w-4 h-4" />
                      ↺ 재분석
                    </>
                  )}
                </button>
              </div>
            </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => handleTabChange('analysis')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MdOutlineAnalytics className="inline w-4 h-4 mr-2" />
            영상 분석
          </button>
          <button
            onClick={() => handleTabChange('whisper')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'whisper'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MdOutlineRecordVoiceOver className="inline w-4 h-4 mr-2" />
            STT 분석 결과
          </button>
          <button
            onClick={() => handleTabChange('video')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'video'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MdOutlineVideoLibrary className="inline w-4 h-4 mr-2" />
            면접 영상
          </button>
          {/* <button
            onClick={() => handleTabChange('recording')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recording'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MdOutlineRecordVoiceOver className="inline w-4 h-4 mr-2" />
            실시간 녹음
          </button> */}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-6">
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">영상 분석 결과</h3>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await api.get(`/video-analysis/result/${applicant.application_id}`);
                      if (response.data.success) {
                        console.log('영상 분석 결과:', response.data);
                        setInterviewData(prev => ({
                          ...prev,
                          videoAnalysis: response.data.analysis,
                          videoAnalysisSource: 'video-analysis-db',
                          hasData: true
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
                  기존 분석 결과 로드
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      console.log('🎤 Whisper 분석 시작...');
                      const response = await api.post(`/whisper-analysis/process/${applicant.application_id}`);
                      
                      if (response.data.success) {
                        console.log('Whisper 분석 시작됨:', response.data);
                        alert(`Whisper 분석이 백그라운드에서 시작되었습니다!\n\n긴 영상의 경우 5-10분 정도 소요될 수 있습니다.\n분석이 완료되면 자동으로 결과가 표시됩니다.`);
                        
                        // 상태 폴링 시작
                        startStatusPolling();
                      } else {
                        console.error('Whisper 분석 시작 실패:', response.data.message);
                        alert('Whisper 분석 시작에 실패했습니다: ' + response.data.message);
                      }
                    } catch (error) {
                      console.error('Whisper 분석 오류:', error);
                      alert('Whisper 분석 중 오류가 발생했습니다: ' + error.message);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  <MdOutlineRecordVoiceOver className="w-4 h-4 mr-2" />
                  Whisper 분석 실행
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      // 먼저 분석 상태 확인
                      const statusResponse = await api.get(`/video-analysis/status/${applicant.application_id}`);
                      console.log('Video Analysis 상태:', statusResponse.data);
                      
                      if (statusResponse.data.status === 'completed') {
                        // 이미 완료된 경우 결과 로드
                        const resultResponse = await api.get(`/video-analysis/result/${applicant.application_id}`);
                        if (resultResponse.data.success) {
                          setInterviewData(prev => ({
                            ...prev,
                            videoAnalysis: resultResponse.data.analysis,
                            videoAnalysisSource: 'video-analysis-db',
                            hasData: true
                          }));
                          alert('기존 분석 결과를 불러왔습니다!');
                          return;
                        }
                      }
                      
                      // 새로운 분석 시작
                      const response = await api.post(`/video-analysis/analyze/${applicant.application_id}`);
                      
                      if (response.data.success) {
                        console.log('Video Analysis 결과:', response.data);
                        
                        // 결과를 상태에 저장
                        setInterviewData(prev => ({
                          ...prev,
                          videoAnalysis: response.data.analysis,
                          videoAnalysisSource: 'video-analysis-db',
                          hasData: true
                        }));
                        
                        if (response.data.is_cached) {
                          alert('기존 분석 결과를 불러왔습니다!');
                        } else {
                          alert('새로운 영상 분석이 완료되었습니다!');
                        }
                      } else {
                        alert('영상 분석에 실패했습니다: ' + response.data.message);
                      }
                    } catch (error) {
                      console.error('Video Analysis 오류:', error);
                      if (error.response?.status === 500) {
                        alert('백엔드 DB 오류가 발생했습니다. 관리자에게 문의하세요.');
                      } else {
                        alert('영상 분석 중 오류가 발생했습니다: ' + (error.response?.data?.detail || error.message));
                      }
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  <MdOutlineAnalytics className="w-4 h-4 mr-2" />
                  AI 영상 분석 (DB 저장)
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      // 대기 중인 분석 개수 확인
                      const countResponse = await api.get('/background-analysis/pending-count');
                      const pendingCount = countResponse.data.pending_count;
                      
                      if (pendingCount === 0) {
                        alert('분석할 영상이 없습니다.');
                        return;
                      }
                      
                      if (!confirm(`총 ${pendingCount}개의 영상을 일괄 분석하시겠습니까?\n\n이 작업은 시간이 오래 걸릴 수 있습니다.`)) {
                        return;
                      }
                      
                      // 일괄 분석 API 호출
                      const response = await api.post('/background-analysis/batch-analyze');
                      
                      if (response.data.status === 'batch_started') {
                        alert(`일괄 분석이 시작되었습니다! (${response.data.count}개 영상)\n\n분석이 완료되면 각 지원자 페이지에서 결과를 확인할 수 있습니다.`);
                      } else if (response.data.status === 'no_pending') {
                        alert('분석할 영상이 없습니다.');
                      } else {
                        alert('일괄 분석 시작에 실패했습니다: ' + response.data.message);
                      }
                    } catch (error) {
                      console.error('일괄 분석 오류:', error);
                      alert('일괄 분석 중 오류가 발생했습니다: ' + (error.response?.data?.detail || error.message));
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm"
                >
                  <MdOutlineVideoLibrary className="w-4 h-4 mr-2" />
                  일괄 분석 실행
                </button>
                
                {/* QA 분석 버튼들 추가 */}
                <button
                  onClick={async () => {
                    try {
                      if (!confirm('구글 드라이브에서 영상을 다운로드하여 QA 분석을 실행하시겠습니까?\n\n이 작업은 시간이 오래 걸릴 수 있습니다.')) {
                        return;
                      }
                      
                      const response = await api.post(`/whisper-analysis/process-qa/${applicant.application_id}?persist=true&output_dir=/app/data/qa_slices&max_workers=3&run_emotion_context=true&delete_after_input=true&delete_video_after=true`);
                      
                      if (response.data.success) {
                        alert(`QA 분석이 시작되었습니다!\n\n총 ${response.data.total_pairs}개의 질문-답변 쌍이 분석됩니다.\n분석이 완료되면 결과가 자동으로 표시됩니다.`);
                        
                        // 데이터 새로고침
                        await loadInterviewData();
                      } else {
                        alert('QA 분석 시작에 실패했습니다.');
                      }
                    } catch (error) {
                      console.error('QA 분석 오류:', error);
                      alert('QA 분석 중 오류가 발생했습니다: ' + error.message);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm"
                >
                  <MdOutlineRecordVoiceOver className="w-4 h-4 mr-2" />
                  드라이브→QA(+감정/문맥)
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const audioPath = prompt('컨테이너 오디오/비디오 경로(/app/data/qa_slices/..):', `/app/data/qa_slices/${applicant.application_id}.wav`);
                      if (!audioPath) return;
                      
                      const body = audioPath.endsWith('.wav') ? { audio_path: audioPath } : { video_path: audioPath };
                      
                      const response = await api.post('/whisper-analysis/process-qa-local', {
                        application_id: applicant.application_id,
                        ...body,
                        persist: true,
                        output_dir: '/app/data/qa_slices',
                        max_workers: 3,
                        run_emotion_context: true,
                        delete_after_input: true,
                        delete_video_after: true
                      });
                      
                      if (response.data.success) {
                        alert(`로컬 파일 QA 분석이 완료되었습니다!\n\n총 ${response.data.total_pairs}개의 질문-답변 쌍이 분석되었습니다.`);
                        
                        // 데이터 새로고침
                        await loadInterviewData();
                      } else {
                        alert('로컬 파일 QA 분석에 실패했습니다.');
                      }
                    } catch (error) {
                      console.error('로컬 QA 분석 오류:', error);
                      alert('로컬 QA 분석 중 오류가 발생했습니다: ' + error.message);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                >
                  <MdOutlineRecordVoiceOver className="w-4 h-4 mr-2" />
                  로컬→QA(+감정/문맥)
                </button>

                {/* 61번 지원자 테스트 버튼 */}
                <button
                  onClick={async () => {
                    try {
                      if (!confirm('61번 지원자 데이터로 AI 면접 분석을 실행하시겠습니까?\n\n구글 드라이브에서 MP4 파일을 다운로드하고 모든 분석을 수행한 후 임시 파일을 자동 삭제합니다.')) {
                        return;
                      }
                      
                      const response = await api.post(`/whisper-analysis/process-qa/61?run_emotion_context=true&delete_video_after=true`);
                      
                      if (response.data.success) {
                        alert(`61번 지원자 AI 면접 분석이 시작되었습니다!\n\n총 ${response.data.total_pairs}개의 질문-답변 쌍이 분석됩니다.\n분석이 완료되면 결과가 자동으로 표시되고 임시 파일이 삭제됩니다.`);
                        
                        // 데이터 새로고침
                        await loadInterviewData();
                      } else {
                        alert('61번 지원자 AI 면접 분석 시작에 실패했습니다.');
                      }
                    } catch (error) {
                      console.error('61번 지원자 분석 오류:', error);
                      alert('61번 지원자 분석 중 오류가 발생했습니다: ' + error.message);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm"
                >
                  <MdOutlineRecordVoiceOver className="w-4 h-4 mr-2" />
                  61번 지원자 테스트
                </button>
              </div>
            </div>
            
            
            {(interviewData?.hasData || interviewData?.evaluation || interviewData?.videoAnalysis || interviewData?.videoAnalysisSource === 'video-analysis-db') ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 종합 점수 */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaBrain className="text-green-600" />
                    종합 평가
                  </h4>
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {(interviewData.videoAnalysis?.overall_score || interviewData.videoAnalysis?.score || interviewData.whisperAnalysis?.analysis?.score || interviewData.evaluation?.total_score) || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {(interviewData.videoAnalysis?.overall_score || interviewData.videoAnalysis?.score || interviewData.whisperAnalysis?.analysis?.score || interviewData.evaluation?.total_score) >= 3.5 ? '✅ 합격' : '❌ 불합격'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(interviewData.videoAnalysis?.analysis_timestamp || interviewData.whisperAnalysis?.analysis?.timestamp || interviewData.evaluation?.timestamp) ? 
                      `분석 시간: ${new Date(interviewData.videoAnalysis?.analysis_timestamp || interviewData.whisperAnalysis?.analysis?.timestamp || interviewData.evaluation?.timestamp).toLocaleString()}` : 
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
                      <span className="font-medium">{(interviewData.videoAnalysis?.total_duration || interviewData.whisperAnalysis?.analysis?.total_duration || interviewData.evaluation?.total_duration) ? `${(interviewData.videoAnalysis?.total_duration || interviewData.whisperAnalysis?.analysis?.total_duration || interviewData.evaluation?.total_duration).toFixed(1)}초` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">발화 시간</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.speaking_time || interviewData.whisperAnalysis?.analysis?.speaking_time || interviewData.evaluation?.speaking_time) ? `${(interviewData.videoAnalysis?.speaking_time || interviewData.whisperAnalysis?.analysis?.speaking_time || interviewData.evaluation?.speaking_time).toFixed(1)}초` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">침묵 비율</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.silence_ratio || interviewData.whisperAnalysis?.analysis?.silence_ratio || interviewData.evaluation?.silence_ratio) ? `${((interviewData.videoAnalysis?.silence_ratio || interviewData.whisperAnalysis?.analysis?.silence_ratio || interviewData.evaluation?.silence_ratio) * 100).toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">분당 발화 속도</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.speaking_speed_wpm || interviewData.whisperAnalysis?.analysis?.speaking_speed_wpm || interviewData.evaluation?.speaking_speed_wpm) ? `${interviewData.videoAnalysis?.speaking_speed_wpm || interviewData.whisperAnalysis?.analysis?.speaking_speed_wpm || interviewData.evaluation?.speaking_speed_wpm}단어` : 'N/A'}</span>
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
                      <span className="font-medium">{(interviewData.videoAnalysis?.avg_energy || interviewData.whisperAnalysis?.analysis?.avg_energy || interviewData.evaluation?.avg_energy) ? (interviewData.videoAnalysis?.avg_energy || interviewData.whisperAnalysis?.analysis?.avg_energy || interviewData.evaluation?.avg_energy).toFixed(4) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">평균 피치</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.avg_pitch || interviewData.whisperAnalysis?.analysis?.avg_pitch || interviewData.evaluation?.avg_pitch) ? `${(interviewData.videoAnalysis?.avg_pitch || interviewData.whisperAnalysis?.analysis?.avg_pitch || interviewData.evaluation?.avg_pitch).toFixed(1)}Hz` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">세그먼트 수</span>
                      <span className="font-medium">{interviewData.videoAnalysis?.segment_count || interviewData.whisperAnalysis?.analysis?.segment_count || interviewData.evaluation?.segment_count || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">평균 세그먼트</span>
                      <span className="font-medium">{(interviewData.videoAnalysis?.avg_segment_duration || interviewData.whisperAnalysis?.analysis?.avg_segment_duration || interviewData.evaluation?.avg_segment_duration) ? `${(interviewData.videoAnalysis?.avg_segment_duration || interviewData.whisperAnalysis?.analysis?.avg_segment_duration || interviewData.evaluation?.avg_segment_duration).toFixed(2)}초` : 'N/A'}</span>
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
                        (interviewData.videoAnalysis?.emotion || interviewData.whisperAnalysis?.analysis?.emotion || interviewData.evaluation?.emotion) === '긍정적' ? 'bg-green-100 text-green-800' :
                        (interviewData.videoAnalysis?.emotion || interviewData.whisperAnalysis?.analysis?.emotion || interviewData.evaluation?.emotion) === '부정적' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {interviewData.videoAnalysis?.emotion || interviewData.whisperAnalysis?.analysis?.emotion || interviewData.evaluation?.emotion || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">태도</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (interviewData.videoAnalysis?.attitude || interviewData.whisperAnalysis?.analysis?.attitude || interviewData.evaluation?.attitude) === '적극적' ? 'bg-blue-100 text-blue-800' :
                        (interviewData.videoAnalysis?.attitude || interviewData.whisperAnalysis?.analysis?.attitude || interviewData.evaluation?.attitude) === '소극적' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {interviewData.videoAnalysis?.attitude || interviewData.whisperAnalysis?.analysis?.attitude || interviewData.evaluation?.attitude || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">자세</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (interviewData.videoAnalysis?.posture || interviewData.whisperAnalysis?.analysis?.posture || interviewData.evaluation?.posture) === '좋음' ? 'bg-green-100 text-green-800' :
                        (interviewData.videoAnalysis?.posture || interviewData.whisperAnalysis?.analysis?.posture || interviewData.evaluation?.posture) === '나쁨' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {interviewData.videoAnalysis?.posture || interviewData.whisperAnalysis?.analysis?.posture || interviewData.evaluation?.posture || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-500 text-lg mb-2">분석 결과가 없습니다</p>
                <p className="text-gray-400 text-sm mb-4">
                  {interviewData?.error ? 
                    `오류: ${interviewData.error}` : 
                    'AI 분석이 완료되지 않았거나 데이터를 불러올 수 없습니다'
                  }
                </p>
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-blue-600 font-medium">
                    💡 아래 버튼들을 사용하여 분석을 시작하거나 데이터를 로드할 수 있습니다
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button 
                      onClick={async () => {
                        try {
                          console.log('🔄 영상 분석 결과 다시 로드 시도...');
                          const response = await api.get(`/video-analysis/result/${applicant.application_id}`);
                          if (response.data.success) {
                            setInterviewData(prev => ({
                              ...prev,
                              videoAnalysis: response.data.analysis,
                              videoAnalysisSource: 'video-analysis-db',
                              hasData: true
                            }));
                          } else {
                            console.error('영상 분석 결과 로드 실패:', response.data.message);
                          }
                        } catch (error) {
                          console.error('영상 분석 결과 로드 실패:', error);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      📊 기존 분석 결과 로드
                    </button>
                    
                    <button 
                      onClick={async () => {
                        try {
                          console.log('🎤 Whisper 분석 시작...');
                          const response = await api.post(`/whisper-analysis/process/${applicant.application_id}`);
                          
                          if (response.data.success) {
                            console.log('Whisper 분석 시작됨:', response.data);
                            alert(`Whisper 분석이 백그라운드에서 시작되었습니다!\n\n긴 영상의 경우 5-10분 정도 소요될 수 있습니다.\n분석이 완료되면 자동으로 결과가 표시됩니다.`);
                            
                            // 상태 폴링 시작
                            startStatusPolling();
                          } else {
                            console.error('Whisper 분석 시작 실패:', response.data.message);
                            alert('Whisper 분석 시작에 실패했습니다: ' + response.data.message);
                          }
                        } catch (error) {
                          console.error('Whisper 분석 오류:', error);
                          alert('Whisper 분석 중 오류가 발생했습니다: ' + error.message);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      🎤 Whisper 분석 시작
                    </button>
                    
                    <button 
                      onClick={async () => {
                        try {
                          // Backend Video Analysis API 호출 (DB 저장 포함)
                          const response = await api.post(`/video-analysis/analyze/${applicant.application_id}`);
                          
                          if (response.data.success) {
                            console.log('Video Analysis 결과:', response.data);
                            setInterviewData(prev => ({
                              ...prev,
                              videoAnalysis: response.data.analysis,
                              videoAnalysisSource: 'video-analysis-db',
                              hasData: true
                            }));
                            
                            if (response.data.is_cached) {
                              alert('기존 분석 결과를 불러왔습니다!');
                            } else {
                              alert('새로운 영상 분석이 완료되었습니다!');
                            }
                          } else {
                            alert('영상 분석에 실패했습니다: ' + response.data.message);
                          }
                        } catch (error) {
                          console.error('Video Analysis 오류:', error);
                          alert('영상 분석 중 오류가 발생했습니다: ' + (error.response?.data?.detail || error.message));
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      🎥 AI 영상 분석 시작
                    </button>
                  </div>
                </div>
              </div>
            )}

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
            {(interviewData.videoAnalysis?.feedback || interviewData.whisperAnalysis?.analysis?.feedback || interviewData.evaluation?.feedback) && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MdOutlinePsychology className="text-blue-600" />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-gray-600">분당 발화 속도</div>
                          <div className="font-medium">{interviewData.whisperAnalysis.analysis?.speaking_speed_wpm ?? 'N/A'} wpm</div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-gray-600">평균 에너지</div>
                          <div className="font-medium">{interviewData.whisperAnalysis.analysis?.avg_energy?.toFixed?.(4) ?? 'N/A'}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-gray-600">평균 피치</div>
                          <div className="font-medium">{interviewData.whisperAnalysis.analysis?.avg_pitch ? `${interviewData.whisperAnalysis.analysis.avg_pitch.toFixed(1)}Hz` : 'N/A'}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-gray-600">세그먼트 수</div>
                          <div className="font-medium">{interviewData.whisperAnalysis.analysis?.segment_count ?? 'N/A'}</div>
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
        )}

        {activeTab === 'whisper' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">STT 분석 결과</h3>
              <p className="text-sm text-gray-600">Whisper STT 기반 음성 분석</p>
            </div>
            
            {interviewData?.whisperAnalysis ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-900 mb-4">음성 인식 결과</h4>
                
                {/* 68번 지원자 실제 STT 데이터 표시 */}
                {applicant.application_id === 68 && interviewData.whisperAnalysis.analysis?.user_analysis ? (
                  <div className="space-y-6">
                    {/* 파일별 분석 결과 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-4">실무진 면접 음성 분석 (68번 지원자)</h5>
                      
                      <div className="space-y-4">
                        {interviewData.whisperAnalysis.analysis.user_analysis.analysis_data.individual_analyses.map((analysis, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-medium text-gray-900">
                                파일 {analysis.file_info.file_index}: {analysis.file_info.filename}
                              </h6>
                              <span className="text-sm text-gray-500">
                                {analysis.file_info.duration_seconds.toFixed(1)}초
                              </span>
                            </div>
                
                            {/* 파일 정보 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                              <div>
                                <span className="text-gray-600">파일 크기:</span>
                                <span className="ml-1 font-medium">{(analysis.file_info.file_size / 1024).toFixed(1)}KB</span>
                              </div>
                              <div>
                                <span className="text-gray-600">샘플레이트:</span>
                                <span className="ml-1 font-medium">{analysis.file_info.sample_rate}Hz</span>
                              </div>
                              <div>
                                <span className="text-gray-600">채널:</span>
                                <span className="ml-1 font-medium">{analysis.file_info.channels}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">언어:</span>
                                <span className="ml-1 font-medium">{analysis.stt_analysis.language.toUpperCase()}</span>
                              </div>
                            </div>
                            
                            {/* 음성 세그먼트 */}
                            <div className="space-y-2">
                              <h6 className="font-medium text-gray-800">음성 세그먼트:</h6>
                              {analysis.stt_analysis.segments.map((segment, segIndex) => (
                                <div key={segIndex} className="bg-gray-50 rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      세그먼트 {segment.id} ({segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s)
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      신뢰도: {((1 + segment.avg_logprob) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <p className="text-gray-800 leading-relaxed">{segment.text}</p>
                                  <div className="mt-2 text-xs text-gray-500">
                                    <span>압축률: {segment.compression_ratio.toFixed(2)}</span>
                                    <span className="ml-3">무음확률: {(segment.no_speech_prob * 100).toFixed(1)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* 전체 텍스트 */}
                            <div className="mt-4 p-3 bg-blue-50 rounded">
                              <h6 className="font-medium text-gray-800 mb-2">전체 전사:</h6>
                              <p className="text-gray-700 leading-relaxed">{analysis.stt_analysis.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : applicant.application_id === 59 && interviewData.whisperAnalysis.analysis?.practice_interview ? (
                  // 59번 지원자 면접 유형별 STT 데이터 표시
                  <div className="space-y-6">
                    {/* 실무진 면접 STT 데이터 */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h5 className="font-medium text-blue-900 mb-4">실무진 면접 음성 분석 (59번 지원자)</h5>
                      
                      <div className="space-y-4">
                        {interviewData.whisperAnalysis.analysis.practice_interview.individual_analyses.map((analysis, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-medium text-blue-900">
                                파일 {analysis.file_info.file_index}: {analysis.file_info.filename}
                              </h6>
                              <span className="text-sm text-blue-600">
                                {analysis.file_info.duration_seconds.toFixed(1)}초
                              </span>
                            </div>
                            
                            {/* 파일 정보 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                              <div>
                                <span className="text-gray-600">파일 크기:</span>
                                <span className="ml-1 font-medium">{(analysis.file_info.file_size / 1024).toFixed(1)}KB</span>
                              </div>
                              <div>
                                <span className="text-gray-600">샘플레이트:</span>
                                <span className="ml-1 font-medium">{analysis.file_info.sample_rate}Hz</span>
                              </div>
                              <div>
                                <span className="text-gray-600">채널:</span>
                                <span className="ml-1 font-medium">{analysis.file_info.channels}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">언어:</span>
                                <span className="ml-1 font-medium">{analysis.stt_analysis.language.toUpperCase()}</span>
                              </div>
                            </div>
                            
                            {/* 음성 세그먼트 */}
                            <div className="space-y-2">
                              <h6 className="font-medium text-blue-800">음성 세그먼트:</h6>
                              {analysis.stt_analysis.segments.map((segment, segIndex) => (
                                <div key={segIndex} className="bg-blue-50 rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-blue-700">
                                      세그먼트 {segment.id} ({segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s)
                                    </span>
                                    <span className="text-xs text-blue-600">
                                      신뢰도: {((1 + segment.avg_logprob) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <p className="text-blue-800 leading-relaxed">{segment.text}</p>
                                  <div className="mt-2 text-xs text-blue-600">
                                    <span>압축률: {segment.compression_ratio.toFixed(2)}</span>
                                    <span className="ml-3">무음확률: {(segment.no_speech_prob * 100).toFixed(1)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* 전체 텍스트 */}
                            <div className="mt-4 p-3 bg-blue-100 rounded">
                              <h6 className="font-medium text-blue-800 mb-2">전체 전사:</h6>
                              <p className="text-blue-700 leading-relaxed">{analysis.stt_analysis.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 임원진 면접 STT 데이터 */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h5 className="font-medium text-purple-900 mb-4">임원진 면접 음성 분석 (59번 지원자)</h5>
                      
                      <div className="space-y-4">
                        {interviewData.whisperAnalysis.analysis.executive_interview.individual_analyses.map((analysis, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-medium text-purple-900">
                                파일 {analysis.file_info.file_index}: {analysis.file_info.filename}
                              </h6>
                              <span className="text-sm text-purple-600">
                                {analysis.file_info.duration_seconds.toFixed(1)}초
                              </span>
                            </div>
                            
                            {/* 파일 정보 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                              <div>
                                <span className="text-gray-600">파일 크기:</span>
                                <span className="ml-1 font-medium">{(analysis.file_info.file_size / 1024).toFixed(1)}KB</span>
                              </div>
                              <div>
                                <span className="text-gray-600">샘플레이트:</span>
                                <span className="ml-1 font-medium">{analysis.file_info.sample_rate}Hz</span>
                              </div>
                              <div>
                                <span className="text-gray-600">채널:</span>
                                <span className="ml-1 font-medium">{analysis.file_info.channels}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">언어:</span>
                                <span className="ml-1 font-medium">{analysis.stt_analysis.language.toUpperCase()}</span>
                              </div>
                            </div>
                            
                            {/* 음성 세그먼트 */}
                            <div className="space-y-2">
                              <h6 className="font-medium text-purple-800">음성 세그먼트:</h6>
                              {analysis.stt_analysis.segments.map((segment, segIndex) => (
                                <div key={segIndex} className="bg-purple-50 rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-purple-700">
                                      세그먼트 {segment.id} ({segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s)
                                    </span>
                                    <span className="text-xs text-purple-600">
                                      신뢰도: {((1 + segment.avg_logprob) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <p className="text-purple-800 leading-relaxed">{segment.text}</p>
                                  <div className="mt-2 text-xs text-purple-600">
                                    <span>압축률: {segment.compression_ratio.toFixed(2)}</span>
                                    <span className="ml-3">무음확률: {(segment.no_speech_prob * 100).toFixed(1)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* 전체 텍스트 */}
                            <div className="mt-4 p-3 bg-purple-100 rounded">
                              <h6 className="font-medium text-purple-800 mb-2">전체 전사:</h6>
                              <p className="text-purple-700 leading-relaxed">{analysis.stt_analysis.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 기존 STT 데이터 표시 (59, 61번 지원자)
                <div className="space-y-4">
                  {/* 전사 결과 */}
                  {interviewData.whisperAnalysis.transcription && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">전사 결과</h5>
                      <div className="bg-white rounded p-3 max-h-48 overflow-y-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                            {interviewData.whisperAnalysis.transcription}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                    {/* 기본 STT 분석 결과 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 기본 정보 */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 mb-3">기본 정보</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>총 면접 시간:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.total_duration ? `${interviewData.whisperAnalysis.analysis.total_duration.toFixed(1)}초` : 'N/A'}</span>
                      </div>
                          <div className="flex justify-between">
                            <span>발화 시간:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.speaking_time ? `${interviewData.whisperAnalysis.analysis.speaking_time.toFixed(1)}초` : 'N/A'}</span>
                    </div>
                          <div className="flex justify-between">
                            <span>침묵 비율:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.silence_ratio ? `${(interviewData.whisperAnalysis.analysis.silence_ratio * 100).toFixed(1)}%` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>세그먼트 수:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.segment_count || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 음성 특성 */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h5 className="font-medium text-green-900 mb-3">음성 특성</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>평균 에너지:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.avg_energy ? interviewData.whisperAnalysis.analysis.avg_energy.toFixed(4) : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>평균 피치:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.avg_pitch ? `${interviewData.whisperAnalysis.analysis.avg_pitch.toFixed(1)}Hz` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>분당 발화 속도:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.speaking_speed_wpm ? `${interviewData.whisperAnalysis.analysis.speaking_speed_wpm}단어` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>평균 세그먼트:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.avg_segment_duration ? `${interviewData.whisperAnalysis.analysis.avg_segment_duration.toFixed(2)}초` : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 평가 결과 */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h5 className="font-medium text-purple-900 mb-3">평가 결과</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>종합 점수:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.score ? `${interviewData.whisperAnalysis.analysis.score}/5.0` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>감정:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.emotion || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>태도:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.attitude || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>자세:</span>
                            <span className="font-medium">{interviewData.whisperAnalysis.analysis?.posture || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* AI 피드백 */}
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h5 className="font-medium text-yellow-900 mb-3">AI 피드백</h5>
                        <div className="text-sm">
                          <p className="text-gray-700 leading-relaxed">
                            {interviewData.whisperAnalysis.analysis?.feedback || '피드백이 없습니다.'}
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            분석 시간: {interviewData.whisperAnalysis.analysis?.timestamp ?
                              new Date(interviewData.whisperAnalysis.analysis.timestamp).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  
                  {/* 전체 데이터 (디버깅용) */}
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">전체 데이터 (JSON)</h5>
                    <div className="bg-white rounded p-3 max-h-96 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(interviewData.whisperAnalysis, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎤</div>
                <p className="text-gray-500 text-lg mb-2">STT 분석 결과가 없습니다</p>
                <p className="text-gray-400 text-sm mb-4">
                  {interviewData?.error ? 
                    `오류: ${interviewData.error}` : 
                    '음성 인식 데이터를 불러올 수 없습니다'
                  }
                </p>
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-blue-600 font-medium">
                    💡 아래 버튼들을 사용하여 STT 분석을 시작하거나 데이터를 로드할 수 있습니다
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                                      <button 
                    onClick={async () => {
                      try {
                        console.log('🔄 STT 데이터 다시 로드 시도...');
                        const response = await api.get(`/whisper-analysis/status/${applicant.application_id}`);
                        console.log('STT 응답:', response.data);
                        if (response.data.has_analysis) {
                          const whisperData = {
                            analysis: {
                              transcription: response.data.transcription,
                              score: response.data.score,
                              timestamp: response.data.created_at,
                              total_duration: null,
                              speaking_time: null,
                              silence_ratio: null,
                              speaking_speed_wpm: null,
                              avg_energy: null,
                              avg_pitch: null,
                              segment_count: null,
                              avg_segment_duration: null,
                              emotion: null,
                              attitude: null,
                              posture: null,
                              feedback: null
                            }
                          };
                          setInterviewData(prev => ({
                            ...prev,
                            whisperAnalysis: whisperData,
                            hasData: true
                          }));
                        } else {
                          console.error('STT 데이터 로드 실패:', response.data.message);
                        }
                      } catch (error) {
                        console.error('STT 데이터 로드 실패:', error);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    📊 STT 데이터 다시 로드
                  </button>
                    
                    <button 
                      onClick={async () => {
                        try {
                          console.log('🔍 Whisper 분석 상태 확인...');
                          const response = await api.get(`/whisper-analysis/status/${applicant.application_id}`);
                          console.log('Whisper 상태:', response.data);
                          
                          if (response.data.has_analysis) {
                            alert(`Whisper 분석 완료!\n생성일: ${new Date(response.data.created_at).toLocaleString()}\n전사 길이: ${response.data.transcription_length}자\n점수: ${response.data.score}점`);
                          } else {
                            alert('Whisper 분석이 아직 실행되지 않았습니다.');
                          }
                        } catch (error) {
                          console.error('Whisper 상태 확인 실패:', error);
                          alert('Whisper 상태 확인 중 오류가 발생했습니다: ' + error.message);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      🔍 Whisper 분석 상태 확인
                    </button>
                    
                    <button 
                      onClick={() => setShowDetailedWhisperAnalysis(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      📋 상세 분석 결과 보기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recording' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MdOutlineRecordVoiceOver className="mr-2 text-blue-600" />
                실시간 면접 녹음 및 분석
              </h3>
              <p className="text-sm text-gray-600">실시간 녹음 또는 기존 파일 업로드로 면접 분석</p>
            </div>
            
            {applicant ? (
              <>
                {/* 지원자 정보 표시 */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">
                        📋 {applicant.name} 지원자 ({applicant.application_id}번)
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        {applicant.email} • {applicant.interview_status || '상태 없음'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-600">
                        면접 유형: {applicant.practical_interview_status ? '실무진' : 'AI'} 면접
                      </p>
                    </div>
                  </div>
                </div>

                {/* 녹음 및 업로드 컴포넌트 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 실시간 녹음 컴포넌트 */}
                  <AudioRecorder
                    applicationId={applicant.application_id}
                    interviewType="practical"
                    onRecordingComplete={(recordingData) => {
                      console.log('녹음 완료:', recordingData);
                      // 녹음 완료 후 데이터 새로고침
                      if (applicant) {
                        loadInterviewData(applicant);
                      }
                    }}
                    onAnalysisComplete={(analysisData) => {
                      console.log('분석 완료:', analysisData);
                      // 분석 완료 후 데이터 새로고침
                      if (applicant) {
                        loadInterviewData(applicant);
                      }
                    }}
                  />
                  
                  {/* 기존 파일 업로드 컴포넌트 */}
                  <AudioUploader
                    applicationId={applicant.application_id}
                    interviewType="practical"
                    onUploadComplete={(fileData, uploadResult) => {
                      console.log('업로드 완료:', fileData, uploadResult);
                      // 업로드 완료 후 데이터 새로고침
                      if (applicant) {
                        loadInterviewData(applicant);
                      }
                    }}
                    onAnalysisComplete={(analysisData) => {
                      console.log('분석 완료:', analysisData);
                      // 분석 완료 후 데이터 새로고침
                      if (applicant) {
                        loadInterviewData(applicant);
                      }
                    }}
                  />
                </div>

                {/* 분석 결과 확인 안내 */}
                                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">💡 분석 결과 확인</h4>
                      <p className="text-sm text-green-700">
                        녹음 및 분석이 완료되면 상단의 <strong>'STT 분석 결과'</strong> 탭에서 상세한 분석 결과를 확인할 수 있습니다.
                      </p>
                      
                      {/* 테스트 버튼 추가 */}
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <h5 className="text-sm font-medium text-green-800 mb-2">🧪 기능 테스트</h5>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              try {
                                console.log('🧪 Whisper 분석 상태 확인 테스트...');
                                const response = await api.get(`/whisper-analysis/status/${applicant.application_id}`);
                                console.log('Whisper 상태:', response.data);
                                alert(`Whisper 분석 상태: ${JSON.stringify(response.data, null, 2)}`);
                              } catch (error) {
                                console.error('Whisper 상태 확인 실패:', error);
                                alert('Whisper 상태 확인 실패: ' + error.message);
                              }
                            }}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                          >
                            Whisper 상태 확인
                          </button>
                          
                          <button
                            onClick={async () => {
                              try {
                                console.log('🧪 QA 분석 결과 확인 테스트...');
                                const response = await api.get(`/whisper-analysis/qa-analysis/${applicant.application_id}`);
                                console.log('QA 분석 결과:', response.data);
                                alert(`QA 분석 결과: ${JSON.stringify(response.data, null, 2)}`);
                              } catch (error) {
                                console.error('QA 분석 결과 확인 실패:', error);
                                alert('QA 분석 결과 확인 실패: ' + error.message);
                              }
                            }}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                          >
                            QA 분석 결과 확인
                          </button>
                          
                          <button
                            onClick={async () => {
                              try {
                                console.log('🧪 비디오 분석 상태 확인 테스트...');
                                const response = await api.get(`/video-analysis/status/${applicant.application_id}`);
                                console.log('비디오 분석 상태:', response.data);
                                alert(`비디오 분석 상태: ${JSON.stringify(response.data, null, 2)}`);
                              } catch (error) {
                                console.error('비디오 분석 상태 확인 실패:', error);
                                alert('비디오 분석 상태 확인 실패: ' + error.message);
                              }
                            }}
                            className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                          >
                            비디오 분석 상태 확인
                          </button>
                        </div>
                      </div>
                    </div>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">🎤</div>
                <p className="text-gray-500 text-lg mb-2">지원자를 선택해주세요</p>
                <p className="text-gray-400 text-sm mb-4">
                  녹음 및 분석을 진행하려면 먼저 지원자를 선택해야 합니다.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-900 mb-2">📋 사용 방법</h4>
                  <ol className="text-sm text-blue-700 space-y-1 text-left">
                    <li>1. 왼쪽 지원자 목록에서 분석할 지원자를 클릭합니다.</li>
                    <li>2. 지원자 상세 정보가 표시됩니다.</li>
                    <li>3. 이 탭에서 실시간 녹음 또는 파일 업로드를 진행합니다.</li>
                    <li>4. 분석 완료 후 'STT 분석 결과' 탭에서 결과를 확인합니다.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-8">
            {/* AI 면접 동영상 섹션 */}
            <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MdOutlineVideoLibrary className="text-blue-600" />
                  AI 면접 동영상
                </h3>
              </div>
              
              {/* 디버그 정보 추가 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">🔍 디버그 정보</h4>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p><strong>지원자 ID:</strong> {applicant.application_id}</p>
                  <p><strong>비디오 URL:</strong> {aiInterviewVideoUrl || '없음'}</p>
                  <p><strong>URL 타입:</strong> {aiInterviewVideoUrl ? 
                    (aiInterviewVideoUrl.includes('drive.google.com') ? 'Google Drive' : 
                     aiInterviewVideoUrl.startsWith('/static/') ? '백엔드 정적 파일' : '일반 URL') : 'N/A'}</p>
                  <p><strong>분석 데이터:</strong> {interviewData?.hasData ? '있음' : '없음'}</p>
                </div>
              </div>
              
              {aiInterviewVideoLoading ? (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : aiInterviewVideoUrl ? (
                <div className="bg-black rounded-lg overflow-hidden">
                  {aiInterviewVideoUrl.includes('drive.google.com') ? (
                    // Google Drive URL인 경우 여러 방법으로 시도
                    <div className="space-y-4">
                      {/* 방법 1: Google Drive 임베드 URL로 변환 */}
                      <div className="bg-gray-100 p-4 rounded">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Google Drive 임베드</h4>
                        <iframe
                          src={aiInterviewVideoUrl.replace('/file/d/', '/embed/').replace('/preview', '')}
                          className="w-full h-80"
                          frameBorder="0"
                          allowFullScreen
                          title="AI 면접 동영상 (Google Drive)"
                        />
                      </div>
                      
                      {/* 방법 2: 다운로드 링크로 video 태그 시도 */}
                      <div className="bg-gray-100 p-4 rounded">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">직접 재생 시도</h4>
                        <video
                          controls
                          className="w-full h-auto"
                          onError={(e) => {
                            console.error('Google Drive video 태그 로드 오류:', e);
                          }}
                        >
                          <source src={aiInterviewVideoUrl.replace('/preview', '/uc?export=download')} type="video/mp4" />
                          <source src={aiInterviewVideoUrl.replace('/file/d/', '/uc?export=download&id=')} type="video/mp4" />
                          브라우저가 비디오를 지원하지 않습니다.
                        </video>
                      </div>
                      
                      {/* 방법 3: 직접 링크 제공 */}
                      <div className="bg-blue-50 p-4 rounded">
                        <h4 className="text-sm font-medium text-blue-700 mb-2">직접 링크</h4>
                        <a 
                          href={aiInterviewVideoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {aiInterviewVideoUrl}
                        </a>
                        <p className="text-xs text-blue-600 mt-2">
                          위 링크를 클릭하여 Google Drive에서 직접 확인하세요.
                        </p>
                      </div>
                    </div>
                  ) : aiInterviewVideoUrl.startsWith('/static/') ? (
                    // 백엔드 정적 파일인 경우
                    <video
                      controls
                      className="w-full h-auto"
                      onError={(e) => {
                        console.error('정적 파일 비디오 로드 오류:', e);
                      }}
                    >
                      <source src={aiInterviewVideoUrl} type="video/mp4" />
                      <source src={aiInterviewVideoUrl.replace('.mp4', '.webm')} type="video/webm" />
                      브라우저가 비디오를 지원하지 않습니다.
                    </video>
                  ) : (
                    // 일반 비디오 URL인 경우 video 태그 사용
                    <video
                      controls
                      className="w-full h-auto"
                      onError={(e) => {
                        console.error('AI 면접 비디오 로드 오류:', e);
                      }}
                    >
                      <source src={aiInterviewVideoUrl} type="video/mp4" />
                      <source src={aiInterviewVideoUrl.replace('.mp4', '.webm')} type="video/webm" />
                      브라우저가 비디오를 지원하지 않습니다.
                    </video>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">🎥</div>
                  <p className="text-gray-500 text-lg mb-2">AI 면접 동영상이 없습니다</p>
                  <p className="text-gray-400 text-sm mb-4">
                    {interviewData?.error ? 
                      `오류: ${interviewData.error}` : 
                      'AI 면접 동영상을 불러올 수 없습니다'
                    }
                  </p>
                  <div className="mt-4">
                    <p className="text-sm text-blue-600 font-medium mb-3">
                      💡 동영상이 없는 경우 다음을 확인해보세요:
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• 지원자의 AI 면접 동영상이 업로드되었는지 확인</p>
                      <p>• Google Drive 링크가 올바른지 확인</p>
                      <p>• 파일 권한 설정이 공개로 되어 있는지 확인</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 기존 면접 영상 섹션 */}
            <div className="space-y-4 border-t pt-8">

              

            </div>
          </div>
        )}
      </div>
      
      {/* 질문별 분석 모달 */}
      <QuestionVideoAnalysisModal
        isOpen={showQuestionAnalysisModal}
        onClose={() => setShowQuestionAnalysisModal(false)}
        applicationId={applicant?.application_id}
      />
      
      {/* 상세 Whisper 분석 모달 */}
      {showDetailedWhisperAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  상세 Whisper 분석 결과
                </h3>
                <button
                  onClick={() => setShowDetailedWhisperAnalysis(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <DetailedWhisperAnalysis applicationId={applicant?.application_id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

InterviewResultDetail.displayName = 'InterviewResultDetail';

export default InterviewResultDetail;
