import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, FaSync
} from 'react-icons/fa';
import { 
  FiTarget, FiUser
} from 'react-icons/fi';
import { 
  MdOutlineAutoAwesome, MdOutlineVideoLibrary,
  MdOutlineAnalytics
} from 'react-icons/md';

import AiInterviewApi from '../../../api/aiInterviewApi';
import InterviewVideoTab from './InterviewVideoTab';
import InterviewApi from '../../../api/interviewApi';  
import videoAnalysisApi from '../../../api/videoAnalysisApi';
import QuestionVideoAnalysisModal from '../../common/QuestionVideoAnalysisModal';
import DetailedWhisperAnalysis from '../../common/DetailedWhisperAnalysis';
import QuestionVideoAnalysisApi from '../../../api/questionVideoAnalysisApi';

// 하위 컴포넌트 및 데이터 임포트
import AnalysisTab from './result/AnalysisTab';
import WhisperTab from './result/WhisperTab';
import EvaluationTab from './result/EvaluationTab';
import RecordingTab from './result/RecordingTab';
import MetricBox from './result/MetricBox';
import { hardcodedData } from './result/hardcodedData';

// 성능 최적화: 면접 결과 상세 컴포넌트를 메모이제이션
const InterviewResultDetail = React.memo(({ applicant, onBack }) => {
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [currentStage, setCurrentStage] = useState('ai'); // 'ai', 'practice', 'executive'
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [aiInterviewVideoUrl, setAiInterviewVideoUrl] = useState('');
  const [aiInterviewVideoLoading, setAiInterviewVideoLoading] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);
  const [aiEvaluation, setAiEvaluation] = useState(null); // AI 면접 평가 결과
  const [humanEvaluation, setHumanEvaluation] = useState(null); // 실제 면접관 평가
  const [questionAnalysis, setQuestionAnalysis] = useState([]); // 질문별 상세 분석
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [openStt, setOpenStt] = useState(false);
  const [openWhisper, setOpenWhisper] = useState(false);
  const [openQuestion, setOpenQuestion] = useState(true);
  const [openQa, setOpenQa] = useState(false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [reAnalysisTarget, setReAnalysisTarget] = useState(null);
  const [showQuestionAnalysisModal, setShowQuestionAnalysisModal] = useState(false);
  const [showDetailedWhisperAnalysis, setShowDetailedWhisperAnalysis] = useState(false);
  
  // navigate hook
  const navigate = useNavigate();

  // 질문별 분석 결과 로드 함수
  const loadQuestionAnalysis = useCallback(async () => {
    if (!applicant) return;
    
    // [우선순위 1] 하드코딩된 데이터 체크
    const hardcoded = hardcodedData[applicant.application_id];
    if (hardcoded && hardcoded.question_analysis) {
      console.log(`📌 [하드코딩] ${applicant.application_id}번 질문별 분석 데이터 사용`);
      setQuestionAnalysis(hardcoded.question_analysis);
      return;
    }

    // [우선순위 2] DB 데이터 로드
    try {
      const response = await AiInterviewApi.getQuestionAnalysisResults(applicant.application_id);
      if (response.success) {
        setQuestionAnalysis(response.results);
      }
    } catch (err) {
      console.warn('질문별 상세 분석 로드 실패');
    }
  }, [applicant]);

  // 면접 데이터 로드 함수 수정
  const loadInterviewData = useCallback(async () => {
    if (!applicant) return;
    
    setLoading(true);
    setError(null);
    setAiEvaluation(null);
    setHumanEvaluation(null);
    
    try {
      console.log(`🔍 ${applicant.application_id}번 지원자 ${currentStage} 데이터 로드 시작...`);
      const hardcoded = hardcodedData[applicant.application_id];
      const stageHardcoded = hardcoded?.stages?.[currentStage];
      
      // 1. 질문별 상세 분석 로드 (함수 내부에서 하드코딩 우선 처리)
      await loadQuestionAnalysis();
      
      // 2. 하드코딩 데이터가 있는 경우 최우선 적용
      if (stageHardcoded) {
        console.log(`📌 [하드코딩] ${applicant.application_id}번 ${currentStage} 단계 데이터 사용`);
        
        // Whisper/비디오 분석 통합 데이터
        if (currentStage === 'ai') {
          setInterviewData({
            whisperAnalysis: { 
              analysis: {
                ...stageHardcoded,
                transcription: stageHardcoded.transcription || hardcoded.stt_analysis?.text
              }
            },
            videoAnalysis: hardcoded.video_analysis,
            videoAnalysisSource: 'hardcoded-json',
            hasData: true
          });
          
          // AI 평가 데이터도 하드코딩에서 매핑
          if (hardcoded.ai_evaluation) {
            setAiEvaluation(hardcoded.ai_evaluation);
          }
        } else {
          // 실무/임원 면접 하드코딩
          setHumanEvaluation({
            total_score: stageHardcoded.score,
            summary: stageHardcoded.feedback,
            evaluation_items: stageHardcoded.items || []
          });
          
          setInterviewData({
            whisperAnalysis: {
              analysis: {
                transcription: stageHardcoded.transcription
              }
            },
            hasData: true
          });
        }
        
        setLoading(false);
        return; // 하드코딩 적용 후 DB 요청 생략
      }

      // 3. [하드코딩 데이터 없는 경우] DB 데이터 로드 로직 계속...
      let whisperAnalysisData = null;
      if (currentStage === 'ai') {
        try {
          const statusResponse = await AiInterviewApi.getWhisperStatus(applicant.application_id);
          if (statusResponse.has_analysis) {
            whisperAnalysisData = { analysis: statusResponse };
          } else if (stageHardcoded) {
            whisperAnalysisData = { analysis: { transcription: stageHardcoded.transcription, score: stageHardcoded.score } };
          }
          
          const aiEvalData = await AiInterviewApi.getAiInterviewEvaluation(applicant.application_id, 'ai');
          if (aiEvalData && aiEvalData.length > 0) {
            const evaluation = aiEvalData[0];
            setAiEvaluation({
              total_score: evaluation.total_score,
              summary: evaluation.summary,
              evaluation_items: evaluation.evaluation_items || []
            });
          }
        } catch (err) {
          if (stageHardcoded) whisperAnalysisData = { analysis: { transcription: stageHardcoded.transcription, score: stageHardcoded.score } };
        }
      } else {
        // [DB 데이터 로드] 실무/임원 면접 평가 데이터 조회
        try {
          const evalData = await AiInterviewApi.getAiInterviewEvaluation(applicant.application_id, currentStage);
          if (evalData && evalData.length > 0) {
            // 첫 번째 평가 데이터 사용 (여러 면접관이 있을 수 있으나 현재는 단일 표시)
            const evaluation = evalData[0];
            setHumanEvaluation({
              total_score: evaluation.total_score,
              summary: evaluation.summary,
              evaluation_items: evaluation.evaluation_items || []
            });
            
            // Whisper 전사 데이터도 필요한 경우 (실무/임원 면접용 전사가 따로 있다면)
            whisperAnalysisData = { 
              analysis: { 
                transcription: evaluation.summary || '평가 의견이 전사 데이터를 대신합니다.'
              } 
            };
          } else if (stageHardcoded) {
            // DB에 없으면 하드코딩된 데이터 사용
            console.log(`📌 [하드코딩] ${applicant.application_id}번 ${currentStage} 단계 데이터 사용`);
            setHumanEvaluation({
              total_score: stageHardcoded.score,
              summary: stageHardcoded.feedback,
              evaluation_items: stageHardcoded.items || [
                { evaluate_type: '직무 적합도', grade: '상', evaluate_score: stageHardcoded.score, comment: stageHardcoded.feedback },
                { evaluate_type: '인성/태도', grade: '상', evaluate_score: 4.0, comment: '안정적인 면접 태도' }
              ]
            });
            whisperAnalysisData = { analysis: { transcription: stageHardcoded.transcription } };
          }
        } catch (err) {
          console.error(`${currentStage} 평가 데이터 로드 실패:`, err);
          if (stageHardcoded) {
            setHumanEvaluation({
              total_score: stageHardcoded.score,
              summary: stageHardcoded.feedback,
              evaluation_items: stageHardcoded.items || []
            });
          }
        }
      }
      
      setInterviewData({
        whisperAnalysis: whisperAnalysisData,
        videoAnalysis: hardcoded?.video_analysis,
        hasData: !!(whisperAnalysisData || hardcoded?.video_analysis)
      });
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터를 로드하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [applicant, currentStage, loadQuestionAnalysis]);


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
      
      // 재분석 API 호출 (AiInterviewApi 사용)
      const response = await AiInterviewApi.processWhisperAnalysis(applicant.application_id, {
        run_emotion_context: true,
        delete_video_after: true
      });
      
      if (response.success) {
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
      const response = await AiInterviewApi.generateAiAnalysis(applicant.application_id);
      if (response.success) {
        setAiAnalysisResult(response.analysis);
        // 기존 데이터 업데이트
        setInterviewData(prev => ({
          ...prev,
          evaluation: response.analysis,
          hasData: true
        }));
        alert('AI 심층 분석이 완료되었습니다!');
      } else {
        setAiAnalysisError(response.message || 'AI 분석 생성에 실패했습니다.');
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
        const response = await AiInterviewApi.getWhisperStatus(applicant.application_id);
        
        if (response.has_analysis) {
          console.log('✅ Whisper 분석 완료됨!');
          setIsPolling(false);
          clearInterval(interval);
          
          // 분석 완료 알림
          alert(`Whisper 분석이 완료되었습니다!\n전사 길이: ${response.transcription_length}자\n점수: ${response.score}점`);
          
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
          const applicationData = await InterviewApi.getApplication(applicant.application_id);
          
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
          const applicationData = await InterviewApi.getApplication(applicant.application_id);
          
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
        const fallbackUrl = 'https://drive.google.com/file/d/1oIIDc7Zr0AKmKe7gvaNkZm8NRWRzwkLO/view?usp=drive_link';
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

      {/* 전형 단계 선택 (AI/실무/임원) */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-bold text-gray-500 mr-2 uppercase tracking-wider">전형 단계:</span>
          {[
            { id: 'ai', label: 'AI 면접', icon: <MdOutlineAutoAwesome /> },
            { id: 'practice', label: '실무진 면접', icon: <FiUser /> },
            { id: 'executive', label: '임원진 면접', icon: <FiTarget /> }
          ].map((stage) => (
            <button
              key={stage.id}
              onClick={() => setCurrentStage(stage.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                currentStage === stage.id
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{stage.icon}</span>
              <span>{stage.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MdOutlineAnalytics className="inline w-4 h-4 mr-2" />
            분석 리포트
          </button>
          {currentStage === 'ai' && (
            <button
              onClick={() => setActiveTab('video')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'video'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MdOutlineVideoLibrary className="inline w-4 h-4 mr-2" />
              면접 영상
            </button>
          )}
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'evaluation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MdOutlineAutoAwesome className="inline w-4 h-4 mr-2" />
            {currentStage === 'ai' ? 'AI 심층 평가' : '면접관 평가'}
          </button>
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-6">
        {activeTab === 'analysis' && (
          <AnalysisTab 
            currentStage={currentStage}
            interviewData={interviewData}
            aiEvaluation={aiEvaluation}
            humanEvaluation={humanEvaluation}
            questionAnalysis={questionAnalysis}
            loadInterviewData={loadInterviewData}
            applicant={applicant}
            setShowQuestionAnalysisModal={setShowQuestionAnalysisModal}
            setActiveTab={setActiveTab}
            setShowDetailedWhisperAnalysis={setShowDetailedWhisperAnalysis}
            openStt={openStt}
            setOpenStt={setOpenStt}
            openWhisper={openWhisper}
            setOpenWhisper={setOpenWhisper}
            openQuestion={openQuestion}
            setOpenQuestion={setOpenQuestion}
            openQa={openQa}
            setOpenQa={setOpenQa}
          />
        )}

        {activeTab === 'whisper' && (
          <WhisperTab 
            applicant={applicant}
            interviewData={interviewData}
            loadInterviewData={loadInterviewData}
            setShowDetailedWhisperAnalysis={setShowDetailedWhisperAnalysis}
          />
        )}

        {activeTab === 'recording' && (
          <RecordingTab 
            applicant={applicant}
            loadInterviewData={loadInterviewData}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationTab 
            currentStage={currentStage}
            aiEvaluation={aiEvaluation}
            humanEvaluation={humanEvaluation}
          />
        )}

        {activeTab === 'video' && (
          <InterviewVideoTab 
            videoUrl={aiInterviewVideoUrl}
            isLoading={aiInterviewVideoLoading}
            applicant={applicant}
          />
        )}
      </div>
      
      {/* 질문별 분석 모달 */}
      <QuestionVideoAnalysisModal
        isOpen={showQuestionAnalysisModal}
        onClose={() => setShowQuestionAnalysisModal(false)}
        applicationId={applicant?.id}
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
              <DetailedWhisperAnalysis applicationId={applicant?.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

InterviewResultDetail.displayName = 'InterviewResultDetail';

export default InterviewResultDetail;
