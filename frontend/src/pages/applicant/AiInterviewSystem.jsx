import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaBrain, FaSmile, FaArrowLeft, FaDownload
} from 'react-icons/fa';
import { 
  FiTarget, FiUser
} from 'react-icons/fi';
import { 
  MdOutlineVolumeUp, MdOutlinePsychology, 
  MdOutlineAutoAwesome, MdOutlineVideoLibrary,
  MdOutlineAnalytics, MdOutlineRecordVoiceOver
} from 'react-icons/md';

import api from '../../api/api';
import { 
  convertDriveUrlToDirect, 
  extractVideoIdFromUrl, 
  extractFolderIdFromUrl,
  getDriveItemType,
  getVideosFromSharedFolder,
  processVideoUrl
} from '../../utils/googleDrive';
import { 
  analyzeVideoByUrl, 
  getAnalysisResult, 
  checkVideoAnalysisHealth 
} from '../../api/videoAnalysisApi';

// Resume 조회 실패 시 안전한 처리를 위한 유틸리티 함수
const safeApiCall = async (apiCall, fallbackValue = null) => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.warn('API 호출 실패:', error);
    return fallbackValue;
  }
};

// Resume 데이터 로드 함수
const loadResumeData = async (resumeId) => {
  if (!resumeId) {
    return { success: false, message: '이력서 ID가 없습니다.' };
  }
  
  try {
    const response = await api.get(`/resumes/${resumeId}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { success: false, message: '이력서를 찾을 수 없습니다.' };
    } else if (error.response && error.response.status === 403) {
      return { success: false, message: '이력서에 접근할 권한이 없습니다.' };
    } else {
      return { success: false, message: '이력서 로드 중 오류가 발생했습니다.' };
    }
  }
};

// 성능 최적화: 상태 정보 헬퍼 함수
const getStatusInfo = (status, score) => {
  if (status === 'AI_INTERVIEW_COMPLETED' || status === 'AI_INTERVIEW_PASSED') {
    return { label: 'AI 면접 합격', color: 'text-green-600', bgColor: 'bg-green-100', score: score || 'N/A' };
  } else if (status === 'AI_INTERVIEW_FAILED') {
    return { label: 'AI 면접 불합격', color: 'text-red-600', bgColor: 'bg-red-100', score: score || 'N/A' };
  } else if (status === 'FIRST_INTERVIEW_SCHEDULED') {
    return { label: 'AI 면접 통과 → 1차 면접 예정', color: 'text-blue-600', bgColor: 'bg-blue-100', score: score || 'N/A' };
  } else if (status === 'FIRST_INTERVIEW_IN_PROGRESS') {
    return { label: 'AI 면접 통과 → 1차 면접 진행중', color: 'text-blue-600', bgColor: 'bg-blue-100', score: score || 'N/A' };
  } else if (status === 'FIRST_INTERVIEW_COMPLETED') {
    return { label: 'AI 면접 통과 → 1차 면접 완료', color: 'text-blue-600', bgColor: 'bg-blue-100', score: score || 'N/A' };
  } else if (status === 'FIRST_INTERVIEW_PASSED') {
    return { label: 'AI 면접 통과 → 1차 면접 합격 (실무진)', color: 'text-green-600', bgColor: 'bg-green-100', score: score || 'N/A' };
  } else if (status === 'FIRST_INTERVIEW_FAILED') {
    return { label: 'AI 면접 통과 → 1차 면접 불합격', color: 'text-red-600', bgColor: 'bg-red-100', score: score || 'N/A' };
  } else if (status === 'SECOND_INTERVIEW_SCHEDULED') {
    return { label: 'AI 면접 통과 → 2차 면접 예정', color: 'text-purple-600', bgColor: 'bg-purple-100', score: score || 'N/A' };
  } else if (status === 'SECOND_INTERVIEW_IN_PROGRESS') {
    return { label: 'AI 면접 통과 → 2차 면접 진행중', color: 'text-purple-600', bgColor: 'bg-purple-100', score: score || 'N/A' };
  } else if (status === 'SECOND_INTERVIEW_COMPLETED') {
    return { label: 'AI 면접 통과 → 2차 면접 완료', color: 'text-purple-600', bgColor: 'bg-purple-100', score: score || 'N/A' };
  } else if (status === 'SECOND_INTERVIEW_PASSED') {
    return { label: 'AI 면접 통과 → 2차 면접 합격 (임원진)', color: 'text-green-600', bgColor: 'bg-green-100', score: score || 'N/A' };
  } else if (status === 'SECOND_INTERVIEW_FAILED') {
    return { label: 'AI 면접 통과 → 2차 면접 불합격', color: 'text-red-600', bgColor: 'bg-red-100', score: score || 'N/A' };
  } else if (status === 'FINAL_INTERVIEW_SCHEDULED') {
    return { label: 'AI 면접 통과 → 최종 면접 예정', color: 'text-orange-600', bgColor: 'bg-orange-100', score: score || 'N/A' };
  } else if (status === 'FINAL_INTERVIEW_IN_PROGRESS') {
    return { label: 'AI 면접 통과 → 최종 면접 진행중', color: 'text-orange-600', bgColor: 'bg-orange-100', score: score || 'N/A' };
  } else if (status === 'FINAL_INTERVIEW_COMPLETED') {
    return { label: 'AI 면접 통과 → 최종 면접 완료', color: 'text-orange-600', bgColor: 'bg-orange-100', score: score || 'N/A' };
  } else if (status === 'FINAL_INTERVIEW_PASSED') {
    return { label: 'AI 면접 통과 → 최종 합격', color: 'text-green-600', bgColor: 'bg-green-100', score: score || 'N/A' };
  } else if (status === 'FINAL_INTERVIEW_FAILED') {
    return { label: 'AI 면접 통과 → 최종 불합격', color: 'text-red-600', bgColor: 'bg-red-100', score: score || 'N/A' };
  } else if (status && status.startsWith('FIRST_INTERVIEW_')) {
    return { label: 'AI 면접 통과 → 1차 면접 (실무진)', color: 'text-blue-600', bgColor: 'bg-blue-100', score: score || 'N/A' };
  } else if (status && status.startsWith('SECOND_INTERVIEW_')) {
    return { label: 'AI 면접 통과 → 2차 면접 (임원진)', color: 'text-purple-600', bgColor: 'bg-purple-100', score: score || 'N/A' };
  } else if (status && status.startsWith('FINAL_INTERVIEW_')) {
    return { label: 'AI 면접 통과 → 최종 면접', color: 'text-orange-600', bgColor: 'bg-orange-100', score: score || 'N/A' };
  } else {
    return { label: '대기중', color: 'text-gray-600', bgColor: 'bg-gray-100', score: score || 'N/A' };
  }
};

// 면접 상태에 따른 버튼 정보 헬퍼 함수
const getButtonInfo = (status) => {
  if (status === 'FIRST_INTERVIEW_SCHEDULED' || status === 'SECOND_INTERVIEW_SCHEDULED' || status === 'FINAL_INTERVIEW_SCHEDULED') {
    return { 
      text: '면접 시작', 
      bgColor: 'bg-blue-600', 
      hoverColor: 'hover:bg-blue-700',
      disabled: false,
      action: 'start'
    };
  } else if (status === 'FIRST_INTERVIEW_IN_PROGRESS' || status === 'SECOND_INTERVIEW_IN_PROGRESS' || status === 'FINAL_INTERVIEW_IN_PROGRESS') {
    return { 
      text: '면접 완료', 
      bgColor: 'bg-orange-600', 
      hoverColor: 'hover:bg-orange-700',
      disabled: false,
      action: 'complete'
    };
  } else if (status === 'FIRST_INTERVIEW_COMPLETED' || status === 'SECOND_INTERVIEW_COMPLETED' || status === 'FINAL_INTERVIEW_COMPLETED' ||
             status === 'FIRST_INTERVIEW_PASSED' || status === 'SECOND_INTERVIEW_PASSED' || status === 'FINAL_INTERVIEW_PASSED' ||
             status === 'FIRST_INTERVIEW_FAILED' || status === 'SECOND_INTERVIEW_FAILED' || status === 'FINAL_INTERVIEW_FAILED') {
    return { 
      text: '면접 평가 보기', 
      bgColor: 'bg-green-600', 
      hoverColor: 'hover:bg-green-700',
      disabled: false,
      action: 'view'
    };
  } else if (status === 'AI_INTERVIEW_COMPLETED' || status === 'AI_INTERVIEW_PASSED' || status === 'AI_INTERVIEW_FAILED') {
    return { 
      text: 'AI 면접 결과 보기', 
      bgColor: 'bg-purple-600', 
      hoverColor: 'hover:bg-purple-700',
      disabled: false,
      action: 'view'
    };
  } else {
    return { 
      text: '면접 평가 보기', 
      bgColor: 'bg-gray-600', 
      hoverColor: 'hover:bg-gray-700',
      disabled: false,
      action: 'view'
    };
  }
};

// 실무진 면접 합격 여부 확인 헬퍼 함수
const getPracticalInterviewResult = (status) => {
  // 실무진 면접 합격 조건: FIRST_INTERVIEW_PASSED 또는 2차/최종 면접 단계로 진행된 경우
  if (status === 'FIRST_INTERVIEW_PASSED' || 
      status === 'SECOND_INTERVIEW_SCHEDULED' || 
      status === 'SECOND_INTERVIEW_IN_PROGRESS' || 
      status === 'SECOND_INTERVIEW_COMPLETED' || 
      status === 'SECOND_INTERVIEW_PASSED' || 
      status === 'FINAL_INTERVIEW_SCHEDULED' || 
      status === 'FINAL_INTERVIEW_IN_PROGRESS' || 
      status === 'FINAL_INTERVIEW_COMPLETED' || 
      status === 'FINAL_INTERVIEW_PASSED') {
    return {
      isPassed: true,
      label: '실무진 면접 합격',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200'
    };
  } else if (status === 'FIRST_INTERVIEW_FAILED') {
    return {
      isPassed: false,
      label: '실무진 면접 불합격',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-200'
    };
  } else {
    return {
      isPassed: null,
      label: '평가 대기중',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200'
    };
  }
};

// 성능 최적화: 지원자 카드 컴포넌트를 메모이제이션
const MemoizedApplicantCard = React.memo(({ applicant, isSelected, onClick }) => {
  const statusInfo = useMemo(() => getStatusInfo(applicant.interview_status, applicant.ai_interview_score), 
    [applicant.interview_status, applicant.ai_interview_score]);
  
  const buttonInfo = useMemo(() => getButtonInfo(applicant.interview_status), 
    [applicant.interview_status]);

  const practicalResult = useMemo(() => getPracticalInterviewResult(applicant.interview_status), 
    [applicant.interview_status]);

  // 성능 최적화: 클릭 핸들러를 useCallback으로 최적화
  const handleEvaluationClick = useCallback(() => {
    onClick(applicant);
  }, [onClick, applicant]);

  // 면접 시작/완료 핸들러
  const handleStartInterview = useCallback(async () => {
    if (buttonInfo.action === 'start') {
      try {
        // 면접 상태를 진행중으로 업데이트
        const newStatus = applicant.interview_status === 'FIRST_INTERVIEW_SCHEDULED' ? 'FIRST_INTERVIEW_IN_PROGRESS' :
                         applicant.interview_status === 'SECOND_INTERVIEW_SCHEDULED' ? 'SECOND_INTERVIEW_IN_PROGRESS' :
                         'FINAL_INTERVIEW_IN_PROGRESS';
        
        await api.put(`/schedules/${applicant.application_id}/interview-status?interview_status=${newStatus}`);
        
        // 면접 시작 페이지로 이동하거나 면접 모달을 열 수 있습니다
        // 여기서는 간단히 알림만 표시
        alert('면접이 시작되었습니다. 면접 진행 페이지로 이동합니다.');
        
        // 면접 진행 페이지로 이동 (실제 구현 시 적절한 경로로 수정)
        // navigate(`/interview/conduct/${applicant.application_id}`);
        
        // 페이지 새로고침하여 상태 업데이트 반영
        window.location.reload();
        
      } catch (error) {
        console.error('면접 시작 오류:', error);
        alert('면접 시작 중 오류가 발생했습니다.');
      }
    } else if (buttonInfo.action === 'complete') {
      try {
        // 면접 상태를 완료로 업데이트
        const newStatus = applicant.interview_status === 'FIRST_INTERVIEW_IN_PROGRESS' ? 'FIRST_INTERVIEW_COMPLETED' :
                         applicant.interview_status === 'SECOND_INTERVIEW_IN_PROGRESS' ? 'SECOND_INTERVIEW_COMPLETED' :
                         'FINAL_INTERVIEW_COMPLETED';
        
        await api.put(`/schedules/${applicant.application_id}/interview-status?interview_status=${newStatus}`);
        
        alert('면접이 완료되었습니다.');
        
        // 페이지 새로고침하여 상태 업데이트 반영
        window.location.reload();
        
      } catch (error) {
        console.error('면접 완료 오류:', error);
        alert('면접 완료 중 오류가 발생했습니다.');
      }
    } else {
      // 면접 평가 보기 또는 기타 동작
      onClick(applicant);
    }
  }, [onClick, applicant, buttonInfo.action]);

  return (
    <div 
      className={`p-4 border rounded-lg transition-all duration-200 ${
        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FiUser className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{applicant.name}</h3>
            <p className="text-sm text-gray-600">{applicant.email}</p>
            {applicant.phone && (
              <p className="text-xs text-gray-500">{applicant.phone}</p>
            )}
            {applicant.created_at && (
              <p className="text-xs text-blue-600">
                지원일: {new Date(applicant.created_at).toLocaleDateString()}
              </p>
            )}
            {!applicant.resume_id && (
              <p className="text-xs text-orange-600">
                ⚠️ 이력서 정보 없음
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.label}
          </div>
          <p className="text-xs text-gray-500 mt-1">AI점수: {statusInfo.score}</p>
          
          {/* 실무진 면접 합격 여부 표시 */}
          <div className={`mt-2 px-3 py-2 rounded-lg border ${practicalResult.bgColor} ${practicalResult.borderColor}`}>
            <div className={`text-xs font-medium ${practicalResult.textColor}`}>
              {practicalResult.label}
            </div>
          </div>
          
          <button
            onClick={handleStartInterview}
            disabled={buttonInfo.disabled}
            className={`mt-2 px-3 py-1 text-xs text-white rounded transition-colors ${
              buttonInfo.disabled 
                ? 'bg-gray-400 cursor-not-allowed' 
                : `${buttonInfo.bgColor} ${buttonInfo.hoverColor}`
            }`}
          >
            {buttonInfo.text}
          </button>
          
          {/* 면접 완료 후 합격/불합격 결정 버튼 */}
          {(applicant.interview_status === 'FIRST_INTERVIEW_COMPLETED' || 
            applicant.interview_status === 'SECOND_INTERVIEW_COMPLETED' || 
            applicant.interview_status === 'FINAL_INTERVIEW_COMPLETED') && (
            <div className="mt-2 space-y-1">
              <button
                onClick={async () => {
                  try {
                    const newStatus = applicant.interview_status === 'FIRST_INTERVIEW_COMPLETED' ? 'FIRST_INTERVIEW_PASSED' :
                                     applicant.interview_status === 'SECOND_INTERVIEW_COMPLETED' ? 'SECOND_INTERVIEW_PASSED' :
                                     'FINAL_INTERVIEW_PASSED';
                    
                    await api.put(`/schedules/${applicant.application_id}/interview-status?interview_status=${newStatus}`);
                    alert('합격 처리되었습니다.');
                    window.location.reload();
                  } catch (error) {
                    console.error('합격 처리 오류:', error);
                    alert('합격 처리 중 오류가 발생했습니다.');
                  }
                }}
                className="w-full px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                합격
              </button>
              <button
                onClick={async () => {
                  try {
                    const newStatus = applicant.interview_status === 'FIRST_INTERVIEW_COMPLETED' ? 'FIRST_INTERVIEW_FAILED' :
                                     applicant.interview_status === 'SECOND_INTERVIEW_COMPLETED' ? 'SECOND_INTERVIEW_FAILED' :
                                     'FINAL_INTERVIEW_FAILED';
                    
                    await api.put(`/schedules/${applicant.application_id}/interview-status?interview_status=${newStatus}`);
                    alert('불합격 처리되었습니다.');
                    window.location.reload();
                  } catch (error) {
                    console.error('불합격 처리 오류:', error);
                    alert('불합격 처리 중 오류가 발생했습니다.');
                  }
                }}
                className="w-full px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                불합격
              </button>
            </div>
          )}
          
          {/* 합격 취소 버튼 */}
          {(applicant.interview_status === 'FIRST_INTERVIEW_PASSED' || 
            applicant.interview_status === 'SECOND_INTERVIEW_PASSED' || 
            applicant.interview_status === 'FINAL_INTERVIEW_PASSED') && (
            <button
              onClick={() => openCancelModal(applicant)}
              className="mt-2 w-full px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              합격 취소
            </button>
          )}
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
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [aiInterviewVideoUrl, setAiInterviewVideoUrl] = useState('');
  const [aiInterviewVideoLoading, setAiInterviewVideoLoading] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);

  // 성능 최적화: 탭 변경 핸들러를 useCallback으로 최적화
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
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

  // 일반 면접 영상 관련 코드 제거 - AI 면접 동영상만 사용

  // 비디오 로드 효과 (하드코딩 우선, 폴백)
  useEffect(() => {
    const loadVideoEffect = async () => {
      if (!applicant) return;
      
      setVideoLoading(true);
      try {
        // 1. DB의 AI 면접 비디오 URL 우선 확인
        console.log(`🔍 ${applicant.application_id}번 지원자 데이터 확인:`, applicant);
        console.log(`🔍 ${applicant.application_id}번 지원자 ai_interview_video_url:`, applicant.ai_interview_video_url);
        console.log(`🔍 ${applicant.application_id}번 지원자 video_url:`, applicant.video_url);
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
        

        
        // 2. DB의 기존 비디오 URL 확인
        if (applicant.video_url) {
          setVideoUrl(applicant.video_url);
          console.log(`✅ ${applicant.application_id}번 지원자 기존 비디오 URL 사용: ${applicant.video_url}`);
          setVideoLoading(false);
          return;
        }
        
        // 3. API 호출로 로컬 비디오 파일 시도
        console.log(`🔍 ${applicant.application_id}번 지원자 API 호출로 비디오 로드 시도`);
        
        try {
          // 로컬 비디오 파일 먼저 시도
          const localVideoResponse = await api.get(`/interview-questions/local-video/${applicant.application_id}`);
          if (localVideoResponse.data.success && localVideoResponse.data.video_url) {
            setVideoUrl(localVideoResponse.data.video_url);
            console.log(`✅ ${applicant.application_id}번 지원자 로컬 비디오 URL 설정: ${localVideoResponse.data.video_url}`);
            setVideoLoading(false);
            return;
          }
        } catch (error) {
          console.log(`⚠️ ${applicant.application_id}번 지원자 로컬 비디오 API 호출 실패:`, error.message);
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
        // 1. DB의 AI 면접 비디오 URL 우선 확인
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
        
        // 2. DB의 기존 비디오 URL 확인
        if (applicant.video_url) {
          setAiInterviewVideoUrl(applicant.video_url);
          console.log(`✅ ${applicant.application_id}번 지원자 기존 비디오 URL 사용: ${applicant.video_url}`);
          setAiInterviewVideoLoading(false);
          return;
        }
        
        // 3. 폴백: 샘플 비디오 URL 사용
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

  // 면접 데이터 로드 효과 (DB에서만 데이터를 가져옴)
  useEffect(() => {
    const loadInterviewData = async () => {
      if (!applicant) return;
      
      setLoading(true);
      setError(null);
      
      try {
        let videoAnalysis = null;
        let videoAnalysisSource = 'database';
        let whisperAnalysis = null;
        
        // DB에서 데이터 로드
        console.log(`🔍 ${applicant.application_id}번 지원자 DB에서 데이터 로드 시도`);
          
        // AI 면접 분석 결과 로드 (JSON 파일 우선, DB 폴백)
        const aiAnalysisResponse = await safeApiCall(() => 
          api.get(`/ai-interview-questions/ai-interview-analysis/${applicant.application_id}`)
        );
        
        if (aiAnalysisResponse && aiAnalysisResponse.success) {
          const analysisData = aiAnalysisResponse.analysis_data;
          videoAnalysisSource = aiAnalysisResponse.data_source;
          
          // JSON 파일에서 로드된 데이터 처리
          if (analysisData && typeof analysisData === 'object') {
            // ai_interview_68.json 형태의 데이터
            if (analysisData.total_duration || analysisData.score) {
              videoAnalysis = {
                total_duration: analysisData.total_duration,
                speaking_time: analysisData.speaking_time,
                silence_ratio: analysisData.silence_ratio,
                segment_count: analysisData.segment_count,
                avg_segment_duration: analysisData.avg_segment_duration,
                avg_energy: analysisData.avg_energy,
                avg_pitch: analysisData.avg_pitch,
                speaking_speed_wpm: analysisData.speaking_speed_wpm,
                emotion: analysisData.emotion,
                attitude: analysisData.attitude,
                posture: analysisData.posture,
                score: analysisData.score,
                feedback: analysisData.feedback,
                timestamp: analysisData.timestamp
              };
            }
            // ai_interview_analysis_68.json 형태의 데이터
            else if (analysisData.overall_evaluation || analysisData.qa_analysis) {
              videoAnalysis = {
                overall_score: analysisData.overall_evaluation?.overall_score,
                status: analysisData.overall_evaluation?.status,
                qa_pairs: analysisData.qa_analysis?.qa_pairs || [],
                total_questions: analysisData.qa_analysis?.total_questions || 0,
                total_answers: analysisData.qa_analysis?.total_answers || 0,
                transcription: analysisData.transcription,
                speaker_diarization: analysisData.speaker_diarization
              };
            }
          }
        }
        
        // STT 분석 결과 로드 (JSON 파일 우선, DB 폴백)
        const whisperResponse = await safeApiCall(() => 
          api.get(`/ai-interview-questions/whisper-analysis/${applicant.application_id}?interview_type=ai_interview`)
        );
        
        if (whisperResponse && whisperResponse.success) {
          whisperAnalysis = whisperResponse.analysis || whisperResponse.whisper_data;
        }
        
        // 3. 기존 평가 데이터 로드 (API 호출) - 404 에러로 인해 주석처리
        // const evaluationResponse = await safeApiCall(() => 
        //   api.get(`/interview-questions/evaluation/${applicant.application_id}`)
        // );
        let evaluation = null;
        
        // if (evaluationResponse && evaluationResponse.success) {
        //   evaluation = evaluationResponse.evaluation;
        // }
        
        // 4. Resume 데이터 로드 (안전하게 처리) - API 호출 오류로 인해 주석처리
        let resumeData = null;
        // console.log('🔍 Resume ID 확인:', applicant.resume_id, applicant);
        
        // if (applicant.resume_id) {
        //   const resumeResult = await loadResumeData(applicant.resume_id);
        //   if (resumeResult.success) {
        //     resumeData = resumeResult.data;
        //     console.log('✅ Resume 데이터 로드 성공:', resumeData);
        //   } else {
        //     console.warn('Resume 로드 실패:', resumeResult.message);
        //   }
        // } else {
        //   console.warn('⚠️ Resume ID가 없습니다:', applicant);
        // }
        
        const finalInterviewData = {
          evaluation,
          videoAnalysis,
          videoAnalysisSource,
          whisperAnalysis,
          resumeData
        };
        
        console.log(`📊 ${applicant.application_id}번 지원자 최종 면접 데이터:`, finalInterviewData);
        console.log(`🎬 비디오 분석:`, finalInterviewData.videoAnalysis);
        console.log(`🎤 STT 분석:`, finalInterviewData.whisperAnalysis);
        
        setInterviewData(finalInterviewData);
        
      } catch (error) {
        console.error('면접 데이터 로드 오류:', error);
        setError('면접 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadInterviewData();
  }, [applicant]);

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
              <h2 className="text-xl font-semibold text-gray-900">{applicant.name} - AI 면접 결과</h2>
              <p className="text-sm text-gray-600">{applicant.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              getStatusInfo(applicant.interview_status, applicant.ai_interview_score).bgColor
            } ${getStatusInfo(applicant.interview_status, applicant.ai_interview_score).color}`}>
              {getStatusInfo(applicant.interview_status, applicant.ai_interview_score).label}
            </span>
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
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  <MdOutlineAutoAwesome className="w-4 h-4 mr-2" />
                  기존 분석 결과 로드
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      // Backend Video Analysis API 호출 (DB 저장 포함)
                      const response = await api.post(`/video-analysis/analyze/${applicant.application_id}`);
                      
                      if (response.data.success) {
                        console.log('Video Analysis 결과:', response.data);
                        console.log('Video Analysis 데이터 구조:', {
                          analysis: response.data.analysis,
                          overall_score: response.data.analysis?.overall_score,
                          facial_expressions: response.data.analysis?.facial_expressions,
                          posture_analysis: response.data.analysis?.posture_analysis,
                          gaze_analysis: response.data.analysis?.gaze_analysis,
                          audio_analysis: response.data.analysis?.audio_analysis
                        });
                        
                        // 결과를 상태에 저장
                        setInterviewData(prev => ({
                          ...prev,
                          videoAnalysis: response.data.analysis,
                          videoAnalysisSource: 'video-analysis-db'
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
              </div>
            </div>
            
            

            
            {(interviewData?.evaluation || interviewData?.videoAnalysis || interviewData?.videoAnalysisSource === 'video-analysis-db') ? (
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
                <p className="text-gray-400 text-sm">AI 분석이 완료되지 않았거나 데이터를 불러올 수 없습니다</p>
                <div className="mt-4">
                  <button 
                    onClick={async () => {
                      try {
                        console.log('🔄 AI 면접 분석 데이터 다시 로드 시도...');
                        const response = await api.get(`/ai-interview-questions/ai-interview-analysis/${applicant.application_id}`);
                        console.log('AI 면접 분석 응답:', response.data);
                        if (response.data.success) {
                          const analysisData = response.data.analysis_data;
                          let videoAnalysis = null;
                          
                          // JSON 파일에서 로드된 데이터 처리
                          if (analysisData && typeof analysisData === 'object') {
                            // ai_interview_68.json 형태의 데이터
                            if (analysisData.total_duration || analysisData.score) {
                              videoAnalysis = {
                                total_duration: analysisData.total_duration,
                                speaking_time: analysisData.speaking_time,
                                silence_ratio: analysisData.silence_ratio,
                                segment_count: analysisData.segment_count,
                                avg_segment_duration: analysisData.avg_segment_duration,
                                avg_energy: analysisData.avg_energy,
                                avg_pitch: analysisData.avg_pitch,
                                speaking_speed_wpm: analysisData.speaking_speed_wpm,
                                emotion: analysisData.emotion,
                                attitude: analysisData.attitude,
                                posture: analysisData.posture,
                                score: analysisData.score,
                                feedback: analysisData.feedback,
                                timestamp: analysisData.timestamp
                              };
                            }
                            // ai_interview_analysis_68.json 형태의 데이터
                            else if (analysisData.overall_evaluation || analysisData.qa_analysis) {
                              videoAnalysis = {
                                overall_score: analysisData.overall_evaluation?.overall_score,
                                status: analysisData.overall_evaluation?.status,
                                qa_pairs: analysisData.qa_analysis?.qa_pairs || [],
                                total_questions: analysisData.qa_analysis?.total_questions || 0,
                                total_answers: analysisData.qa_analysis?.total_answers || 0,
                                transcription: analysisData.transcription,
                                speaker_diarization: analysisData.speaker_diarization
                              };
                            }
                          }
                          
                          setInterviewData(prev => ({
                            ...prev,
                            videoAnalysis,
                            videoAnalysisSource: response.data.data_source
                          }));
                        } else {
                          console.error('AI 면접 분석 결과 로드 실패:', response.data.message);
                        }
                      } catch (error) {
                        console.error('AI 면접 분석 결과 로드 실패:', error);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    AI 면접 분석 데이터 다시 로드
                  </button>
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
                <p className="text-gray-400 text-sm">음성 인식 데이터를 불러올 수 없습니다</p>
                <div className="mt-4">
                  <button 
                    onClick={async () => {
                      try {
                        console.log('🔄 STT 데이터 다시 로드 시도...');
                        const response = await api.get(`/ai-interview-questions/whisper-analysis/${applicant.application_id}?interview_type=ai_interview`);
                        console.log('STT 응답:', response.data);
                        if (response.data.success) {
                          setInterviewData(prev => ({
                            ...prev,
                            whisperAnalysis: response.data.analysis || response.data.whisper_data
                          }));
                        } else {
                          console.error('STT 데이터 로드 실패:', response.data.message);
                        }
                      } catch (error) {
                        console.error('STT 데이터 로드 실패:', error);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    STT 데이터 다시 로드
                  </button>
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
              
              {aiInterviewVideoLoading ? (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : aiInterviewVideoUrl ? (
                <div className="bg-black rounded-lg overflow-hidden">
                  {aiInterviewVideoUrl.includes('drive.google.com') ? (
                    // Google Drive URL인 경우 iframe으로 표시
                    <iframe
                      src={aiInterviewVideoUrl}
                      className="w-full h-96"
                      frameBorder="0"
                      allowFullScreen
                      title="AI 면접 동영상"
                      onError={(e) => {
                        console.error('Google Drive iframe 로드 오류:', e);
                        console.error('iframe URL:', aiInterviewVideoUrl);
                        console.error('지원자 ID:', applicant.application_id);
                      }}
                    />
                  ) : (
                    // 일반 비디오 URL인 경우 video 태그 사용
                    <video
                      controls
                      className="w-full h-auto"
                      onError={(e) => {
                        console.error('AI 면접 비디오 로드 오류:', e);
                        console.error('비디오 URL:', aiInterviewVideoUrl);
                        console.error('지원자 ID:', applicant.application_id);
                      }}
                    >
                      <source src={aiInterviewVideoUrl} type="video/mp4" />
                      <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
                      <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" type="video/mp4" />
                      브라우저가 비디오를 지원하지 않습니다.
                    </video>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">🎥</div>
                  <p className="text-gray-500 text-lg mb-2">AI 면접 동영상이 없습니다</p>
                  <p className="text-gray-400 text-sm">AI 면접 동영상을 불러올 수 없습니다</p>
                </div>
              )}
            </div>

            {/* 기존 면접 영상 섹션 */}
            <div className="space-y-4 border-t pt-8">

              

            </div>
          </div>
        )}
      </div>
    </div>
  );
});

InterviewResultDetail.displayName = 'InterviewResultDetail';

// 메인 AI 면접 시스템 컴포넌트
const AiInterviewSystem = () => {
  const { jobPostId } = useParams();
  const navigate = useNavigate();
  
  // 상태 관리
  const [applicantsList, setApplicantsList] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isCompletingStage, setIsCompletingStage] = useState(false);
  const [isClosingPracticalInterview, setIsClosingPracticalInterview] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedApplicantForCancel, setSelectedApplicantForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // 성능 최적화: 지원자 선택 핸들러를 useCallback으로 최적화
  const handleApplicantSelect = useCallback((applicant) => {
    setSelectedApplicant(applicant);
  }, []);

  // 성능 최적화: 뒤로가기 핸들러를 useCallback으로 최적화
  const handleBackToList = useCallback(() => {
    setSelectedApplicant(null);
  }, []);

  // 현재 면접 단계와 다음 단계 정보 계산
  const getCurrentStageInfo = useMemo(() => {
    if (!applicantsList.length) return null;
    
    // 현재 단계별 지원자 수 계산
    const stageCounts = {
      first_completed: 0,
      first_passed: 0,
      second_completed: 0,
      second_passed: 0,
      final_completed: 0,
      final_passed: 0
    };
    
    applicantsList.forEach(applicant => {
      const status = applicant.interview_status;
      if (status === 'FIRST_INTERVIEW_COMPLETED') stageCounts.first_completed++;
      if (status === 'FIRST_INTERVIEW_PASSED') stageCounts.first_passed++;
      if (status === 'SECOND_INTERVIEW_COMPLETED') stageCounts.second_completed++;
      if (status === 'SECOND_INTERVIEW_PASSED') stageCounts.second_passed++;
      if (status === 'FINAL_INTERVIEW_COMPLETED') stageCounts.final_completed++;
      if (status === 'FINAL_INTERVIEW_PASSED') stageCounts.final_passed++;
    });
    
    // 현재 단계와 다음 단계 결정
    if (stageCounts.first_completed > 0) {
      return {
        currentStage: '1차 면접 완료',
        nextStage: '1차 면접 합격/불합격 결정',
        action: 'complete_first_stage',
        count: stageCounts.first_completed
      };
    } else if (stageCounts.first_passed > 0 && stageCounts.second_completed === 0) {
      return {
        currentStage: '1차 면접 합격',
        nextStage: '2차 면접 진행',
        action: 'start_second_stage',
        count: stageCounts.first_passed
      };
    } else if (stageCounts.second_completed > 0) {
      return {
        currentStage: '2차 면접 완료',
        nextStage: '2차 면접 합격/불합격 결정',
        action: 'complete_second_stage',
        count: stageCounts.second_completed
      };
    } else if (stageCounts.second_passed > 0 && stageCounts.final_completed === 0) {
      return {
        currentStage: '2차 면접 합격',
        nextStage: '최종 면접 진행',
        action: 'start_final_stage',
        count: stageCounts.second_passed
      };
    } else if (stageCounts.final_completed > 0) {
      return {
        currentStage: '최종 면접 완료',
        nextStage: '최종 합격자 결정',
        action: 'complete_final_stage',
        count: stageCounts.final_completed
      };
    } else if (stageCounts.final_passed > 0) {
      return {
        currentStage: '최종 면접 합격',
        nextStage: '최종 합격자 확정',
        action: 'finalize_selection',
        count: stageCounts.final_passed
      };
    }
    
    return null;
  }, [applicantsList]);

  // 단계 마무리 완료 핸들러
  const handleCompleteStage = useCallback(async () => {
    if (!getCurrentStageInfo) return;
    
    setIsCompletingStage(true);
    
    try {
      const { action, count } = getCurrentStageInfo;
      
      // 해당 단계의 지원자들 필터링
      let targetApplicants = [];
      let newStatus = '';
      
      switch (action) {
        case 'complete_first_stage':
          targetApplicants = applicantsList.filter(a => a.interview_status === 'FIRST_INTERVIEW_COMPLETED');
          // 1차 면접 완료자들을 2차 면접 예정으로 변경
          newStatus = 'SECOND_INTERVIEW_SCHEDULED';
          break;
        case 'start_second_stage':
          targetApplicants = applicantsList.filter(a => a.interview_status === 'FIRST_INTERVIEW_PASSED');
          // 1차 면접 합격자들을 2차 면접 예정으로 변경
          newStatus = 'SECOND_INTERVIEW_SCHEDULED';
          break;
        case 'complete_second_stage':
          targetApplicants = applicantsList.filter(a => a.interview_status === 'SECOND_INTERVIEW_COMPLETED');
          // 2차 면접 완료자들을 최종 면접 예정으로 변경
          newStatus = 'FINAL_INTERVIEW_SCHEDULED';
          break;
        case 'start_final_stage':
          targetApplicants = applicantsList.filter(a => a.interview_status === 'SECOND_INTERVIEW_PASSED');
          // 2차 면접 합격자들을 최종 면접 예정으로 변경
          newStatus = 'FINAL_INTERVIEW_SCHEDULED';
          break;
        case 'complete_final_stage':
          targetApplicants = applicantsList.filter(a => a.interview_status === 'FINAL_INTERVIEW_COMPLETED');
          // 최종 면접 완료자들을 최종 합격으로 변경
          newStatus = 'FINAL_INTERVIEW_PASSED';
          break;
        case 'finalize_selection':
          targetApplicants = applicantsList.filter(a => a.interview_status === 'FINAL_INTERVIEW_PASSED');
          // 최종 합격자들을 최종 확정으로 변경 (final_status 업데이트)
          newStatus = 'FINAL_INTERVIEW_PASSED';
          break;
      }
      
      // 일괄 상태 업데이트
      let updatePromises = targetApplicants.map(applicant =>
        api.put(`/schedules/${applicant.application_id}/interview-status?interview_status=${newStatus}`)
      );
      
      await Promise.all(updatePromises);
      
      // 최종 합격자 확정 시 final_status 업데이트
      if (action === 'finalize_selection') {
        try {
          const finalSelectionResponse = await api.post(`/interview-evaluation/job-post/${jobPostId}/final-selection`);
          if (finalSelectionResponse.data.success) {
            console.log('최종 선발 업데이트 성공:', finalSelectionResponse.data);
          }
        } catch (finalError) {
          console.error('최종 선발 업데이트 오류:', finalError);
          // 최종 선발 업데이트 실패해도 면접 상태는 이미 업데이트되었으므로 계속 진행
        }
      }
      
      // 성공 메시지
      let message = '';
      switch (action) {
        case 'complete_first_stage':
          message = `${count}명의 1차 면접 완료자를 2차 면접 예정으로 변경했습니다.`;
          break;
        case 'start_second_stage':
          message = `${count}명의 1차 면접 합격자를 2차 면접 예정으로 변경했습니다.`;
          break;
        case 'complete_second_stage':
          message = `${count}명의 2차 면접 완료자를 최종 면접 예정으로 변경했습니다.`;
          break;
        case 'start_final_stage':
          message = `${count}명의 2차 면접 합격자를 최종 면접 예정으로 변경했습니다.`;
          break;
        case 'complete_final_stage':
          message = `${count}명의 최종 면접 완료자를 최종 합격으로 변경했습니다.`;
          break;
        case 'finalize_selection':
          message = `${count}명의 최종 합격자를 확정하고 final_status를 업데이트했습니다.`;
          break;
      }
      
      alert(message);
      
      // 페이지 새로고침
      window.location.reload();
      
    } catch (error) {
      console.error('단계 마무리 오류:', error);
      alert('단계 마무리 중 오류가 발생했습니다.');
    } finally {
      setIsCompletingStage(false);
    }
    }, [getCurrentStageInfo, applicantsList]);

  // 실무진 면접 마감 핸들러
  const handleClosePracticalInterview = useCallback(async () => {
    setIsClosingPracticalInterview(true);
    
    try {
      // 실무진 면접 단계의 지원자들 필터링 (진행중, 완료, 합격, 불합격)
      const practicalInterviewApplicants = applicantsList.filter(applicant => {
        const status = applicant.interview_status;
        return status === 'FIRST_INTERVIEW_IN_PROGRESS' || 
               status === 'FIRST_INTERVIEW_COMPLETED' || 
               status === 'FIRST_INTERVIEW_PASSED' || 
               status === 'FIRST_INTERVIEW_FAILED';
      });
      
      if (practicalInterviewApplicants.length === 0) {
        alert('마감할 실무진 면접이 없습니다.');
        return;
      }
      
      // 각 지원자별로 적절한 상태로 업데이트
      const updatePromises = practicalInterviewApplicants.map(async (applicant) => {
        let newStatus = '';
        
        switch (applicant.interview_status) {
          case 'FIRST_INTERVIEW_IN_PROGRESS':
            // 진행중인 경우 완료로 변경
            newStatus = 'FIRST_INTERVIEW_COMPLETED';
            break;
          case 'FIRST_INTERVIEW_COMPLETED':
            // 완료된 경우 합격으로 변경 (다음 단계로 진행)
            newStatus = 'FIRST_INTERVIEW_PASSED';
            break;
          case 'FIRST_INTERVIEW_PASSED':
            // 이미 합격인 경우 그대로 유지
            newStatus = 'FIRST_INTERVIEW_PASSED';
            break;
          case 'FIRST_INTERVIEW_FAILED':
            // 이미 불합격인 경우 그대로 유지
            newStatus = 'FIRST_INTERVIEW_FAILED';
            break;
          default:
            return; // 처리하지 않음
        }
        
        return api.put(`/schedules/${applicant.application_id}/interview-status?interview_status=${newStatus}`);
      });
      
      await Promise.all(updatePromises);
      
      // 성공 메시지
      const inProgressCount = practicalInterviewApplicants.filter(a => 
        a.interview_status === 'FIRST_INTERVIEW_IN_PROGRESS'
      ).length;
      
      const completedCount = practicalInterviewApplicants.filter(a => 
        a.interview_status === 'FIRST_INTERVIEW_COMPLETED'
      ).length;
      
      const alreadyPassedCount = practicalInterviewApplicants.filter(a => 
        a.interview_status === 'FIRST_INTERVIEW_PASSED'
      ).length;
      
      const alreadyFailedCount = practicalInterviewApplicants.filter(a => 
        a.interview_status === 'FIRST_INTERVIEW_FAILED'
      ).length;
      
      let message = `실무진 면접이 마감되었습니다.\n\n`;
      if (inProgressCount > 0) {
        message += `✅ ${inProgressCount}명: 진행중 → 완료\n`;
      }
      if (completedCount > 0) {
        message += `✅ ${completedCount}명: 완료 → 합격 (2차 면접 진행)\n`;
      }
      if (alreadyPassedCount > 0) {
        message += `ℹ️ ${alreadyPassedCount}명: 이미 합격 (변경 없음)\n`;
      }
      if (alreadyFailedCount > 0) {
        message += `ℹ️ ${alreadyFailedCount}명: 이미 불합격 (변경 없음)\n`;
      }
      message += `\n합격자들은 2차 면접 단계로 자동 진행됩니다.`;
      
      alert(message);
      
      // 페이지 새로고침
      window.location.reload();
      
    } catch (error) {
      console.error('실무진 면접 마감 오류:', error);
      alert('실무진 면접 마감 중 오류가 발생했습니다.');
    } finally {
      setIsClosingPracticalInterview(false);
    }
  }, [applicantsList]);

  // 합격 취소 핸들러
  const handleCancelPass = useCallback(async () => {
    if (!selectedApplicantForCancel) return;
    
    try {
      const response = await api.put(`/schedules/${selectedApplicantForCancel.application_id}/interview-status-with-history`, {
        interview_status: selectedApplicantForCancel.interview_status.replace('PASSED', 'FAILED'),
        reason: cancelReason || '합격 취소'
      });
      
      if (response.data.success) {
        alert('합격이 취소되었습니다.');
        setShowCancelModal(false);
        setSelectedApplicantForCancel(null);
        setCancelReason('');
        window.location.reload();
      }
    } catch (error) {
      console.error('합격 취소 오류:', error);
      alert('합격 취소 중 오류가 발생했습니다.');
    }
  }, [selectedApplicantForCancel, cancelReason]);

  // 합격 취소 모달 열기
  const openCancelModal = useCallback((applicant) => {
    setSelectedApplicantForCancel(applicant);
    setShowCancelModal(true);
  }, []);
  
  // 지원자 목록 로드
  useEffect(() => {
    const fetchApplicantsList = async () => {
      if (!jobPostId) return;
      
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      
      try {
        // 1. 캐시 확인
        const cache = JSON.parse(localStorage.getItem('applicantsCache') || '{}');
        if (cache.applicantsCache && cache.applicantsCache[jobPostId]) {
          const cachedApplicants = cache.applicantsCache[jobPostId];
          
          // 캐시된 데이터에도 필터링 적용
          const filteredCachedApplicants = cachedApplicants.filter(applicant => {
            const status = applicant.interview_status;
            // AI 면접 완료 또는 실무진/임원진 면접 단계 지원자 표시 (모두 AI 면접 통과자)
            return status === 'AI_INTERVIEW_COMPLETED' || 
                   status === 'AI_INTERVIEW_PASSED' || 
                   status === 'AI_INTERVIEW_FAILED' ||
                   (status && (
                     status.startsWith('FIRST_INTERVIEW_') || 
                     status.startsWith('SECOND_INTERVIEW_') || 
                     status.startsWith('FINAL_INTERVIEW_')
                   ));
          });
          
          setApplicantsList(filteredCachedApplicants);
          setLoadingProgress(100);
          setIsInitialLoad(false);
          console.log('✅ AI 면접 통과자 목록 캐시에서 로드 (AI/실무진/임원진 면접):', filteredCachedApplicants.length, '명');
        } else {
          // 2. 지원자 목록 로드
          setLoadingProgress(60);
          console.log('🔍 API 호출 시작:', `/applications/job/${jobPostId}/applicants-with-ai-interview`);
          const applicantsRes = await api.get(`/applications/job/${jobPostId}/applicants-with-ai-interview`);
          console.log('✅ API 응답:', applicantsRes.data);
          const applicants = applicantsRes.data || [];
          
          // 지원자 데이터 매핑 개선
          const mappedApplicants = applicants.map(applicant => ({
            ...applicant,
            application_id: applicant.application_id,
            applicant_id: applicant.applicant_id,
            name: applicant.name || '',
            email: applicant.email || '',
            interview_status: applicant.interview_status,
            applied_at: applicant.applied_at,
            ai_interview_score: applicant.ai_interview_score,
            resume_id: applicant.resume_id || null,
            // 디버깅을 위한 로그
            debug_info: {
              original_resume_id: applicant.resume_id,
              mapped_resume_id: applicant.resume_id || null
            }
          }));
          
          console.log('🔍 매핑된 지원자 데이터:', mappedApplicants.map(app => ({
            id: app.application_id,
            name: app.name,
            resume_id: app.resume_id,
            debug_info: app.debug_info
          })));
          
          // interview_status에 따라 필터링 (AI 면접 완료 또는 실무진/임원진 면접 단계 지원자 표시)
          const filteredApplicants = mappedApplicants.filter(applicant => {
            const status = applicant.interview_status;
            // AI 면접 완료 또는 실무진/임원진 면접 단계 지원자 표시 (모두 AI 면접 통과자)
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
          
          setApplicantsList(sortedApplicants);
          setLoadingProgress(100);
          setIsInitialLoad(false);
          
          // 캐시에 저장
          const updatedCache = {
            ...cache,
            applicantsCache: {
              ...cache.applicantsCache,
              [jobPostId]: sortedApplicants
            }
          };
          localStorage.setItem('applicantsCache', JSON.stringify(updatedCache));
          
          console.log('✅ AI 면접 통과자 목록 로드 완료 (AI/실무진/임원진 면접):', sortedApplicants.length, '명');
        }
      } catch (error) {
        console.error('지원자 목록 로드 오류:', error);
        if (error.response) {
          console.error('API 응답 오류:', error.response.data);
          setError(`API 오류: ${error.response.data.detail || error.response.data.message || '지원자 목록을 불러오는 중 오류가 발생했습니다.'}`);
        } else if (error.request) {
          console.error('네트워크 오류:', error.request);
          setError('네트워크 연결을 확인해주세요.');
        } else {
          setError('지원자 목록을 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchApplicantsList();
  }, [jobPostId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">지원자 목록을 불러오는 중...</p>
                <div className="w-64 bg-gray-200 rounded-full h-2 mt-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <p className="text-red-600 text-lg mb-2">오류가 발생했습니다</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">면접 관리 시스템</h1>
              <p className="text-gray-600 mt-1">채용 공고 ID: {jobPostId}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">총 지원자</p>
                <p className="text-2xl font-bold text-blue-600">{applicantsList.length}명</p>
              </div>
              <button
                onClick={() => navigate(`/ai-interview-demo/${jobPostId}/demo`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                title="AI 면접 시스템 데모 보기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                AI 면접 데모
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                돌아가기
              </button>
            </div>
          </div>
          
          {/* 실무진 면접 합격/불합격 통계 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const stats = {
                passed: 0,
                failed: 0,
                pending: 0
              };
              
              applicantsList.forEach(applicant => {
                const result = getPracticalInterviewResult(applicant.interview_status);
                if (result.isPassed === true) stats.passed++;
                else if (result.isPassed === false) stats.failed++;
                else stats.pending++;
              });
              
              return (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-green-600">실무진 면접 합격</p>
                        <p className="text-2xl font-bold text-green-700">{stats.passed}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-red-600">실무진 면접 불합격</p>
                        <p className="text-2xl font-bold text-red-700">{stats.failed}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-gray-600">평가 대기중</p>
                        <p className="text-2xl font-bold text-gray-700">{stats.pending}명</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Application 상태 통계 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            {(() => {
              const appStats = {
                inProgress: 0,
                passed: 0,
                failed: 0,
                selected: 0
              };
              
              applicantsList.forEach(applicant => {
                if (applicant.final_status === 'SELECTED') appStats.selected++;
                else if (applicant.document_status === 'PASSED') {
                  if (applicant.interview_status && applicant.interview_status.includes('FAILED')) {
                    appStats.failed++;
                  } else {
                    appStats.passed++;
                  }
                } else {
                  appStats.inProgress++;
                }
              });
              
              return (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-blue-600">진행중</p>
                        <p className="text-2xl font-bold text-blue-700">{appStats.inProgress}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-green-600">합격</p>
                        <p className="text-2xl font-bold text-green-700">{appStats.passed}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-red-600">불합격</p>
                        <p className="text-2xl font-bold text-red-700">{appStats.failed}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm text-purple-600">최종 선발</p>
                        <p className="text-2xl font-bold text-purple-700">{appStats.selected}명</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* 실무진 면접 마감 버튼 */}
          {(() => {
            const practicalInterviewApplicants = applicantsList.filter(applicant => {
              const status = applicant.interview_status;
              return status === 'FIRST_INTERVIEW_IN_PROGRESS' || 
                     status === 'FIRST_INTERVIEW_COMPLETED' || 
                     status === 'FIRST_INTERVIEW_PASSED' || 
                     status === 'FIRST_INTERVIEW_FAILED';
            });
            
            if (practicalInterviewApplicants.length > 0) {
              return (
                <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">실무진 면접 마감</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        실무진 면접 단계를 한번에 마감하고 다음 단계로 진행합니다. ({practicalInterviewApplicants.length}명)
                      </p>
                      <p className="text-xs text-orange-600 mt-2">
                        ⚠️ 진행중인 면접은 완료로, 완료된 면접은 합격으로 처리됩니다.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        💡 이 버튼을 클릭하면 실무진 면접 단계를 건너뛰고 다음 단계로 진행할 수 있습니다.
                      </p>
                    </div>
                    <button
                      onClick={handleClosePracticalInterview}
                      disabled={isClosingPracticalInterview}
                      className={`px-6 py-3 text-white rounded-lg font-medium transition-colors ${
                        isClosingPracticalInterview
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                      }`}
                    >
                      {isClosingPracticalInterview ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          마감중...
                        </div>
                      ) : (
                        '실무진 면접 마감'
                      )}
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* 단계 마무리 완료 버튼 */}
          {getCurrentStageInfo && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">현재 단계: {getCurrentStageInfo.currentStage}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    다음 단계: {getCurrentStageInfo.nextStage} ({getCurrentStageInfo.count}명)
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 이 버튼을 클릭하면 현재 단계를 마무리하고 다음 단계로 진행합니다.
                  </p>
                </div>
                <button
                  onClick={handleCompleteStage}
                  disabled={isCompletingStage}
                  className={`px-6 py-3 text-white rounded-lg font-medium transition-colors ${
                    isCompletingStage
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {isCompletingStage ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      처리중...
                    </div>
                  ) : (
                    '단계 마무리 완료'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 메인 콘텐츠 */}
        {selectedApplicant ? (
          <InterviewResultDetail 
            applicant={selectedApplicant} 
            onBack={handleBackToList} 
          />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">AI 면접 통과자 목록</h2>
              <p className="text-gray-600">AI 면접을 통과하여 실무진/임원진 면접 단계에 있는 지원자들의 결과를 확인할 수 있습니다.</p>
            </div>

            {applicantsList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500 text-lg mb-2">AI 면접 통과자가 없습니다</p>
                <p className="text-gray-400 text-sm">AI 면접을 통과하여 실무진/임원진 면접 단계에 있는 지원자가 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applicantsList.map((applicant) => (
                  <MemoizedApplicantCard
                    key={applicant.application_id}
                    applicant={applicant}
                    isSelected={selectedApplicant?.application_id === applicant.application_id}
                    onClick={handleApplicantSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 합격 취소 모달 */}
      {showCancelModal && selectedApplicantForCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              합격 취소 확인
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>{selectedApplicantForCancel.name}</strong>님의 합격을 취소하시겠습니까?
              </p>
              <p className="text-xs text-gray-500">
                현재 상태: {getStatusInfo(selectedApplicantForCancel.interview_status, selectedApplicantForCancel.ai_interview_score).label}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                취소 사유 (선택사항)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="합격 취소 사유를 입력하세요..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedApplicantForCancel(null);
                  setCancelReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCancelPass}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                합격 취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiInterviewSystem; 