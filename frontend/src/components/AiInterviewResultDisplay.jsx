import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiPlay, FiPause, FiVolume2, FiFileText, FiClock, FiUser, 
  FiMessageSquare, FiBarChart2, FiDownload, FiRefreshCw,
  FiCheckCircle, FiX, FiList, FiTarget, FiTrendingUp, FiVideo
} from 'react-icons/fi';
import { 
  MdOutlineAutoAwesome, MdOutlinePsychology,
  MdOutlineLanguage, MdOutlineGesture,
  MdOutlineVerified, MdOutlinePlayArrow
} from 'react-icons/md';
import { 
  FaUsers, FaMicrophone, FaCheckCircle, FaTimesCircle,
  FaBrain, FaSmile, FaHandPaper, FaEye, FaVolumeUp
} from 'react-icons/fa';
import api from '../api/api';

const AiInterviewResultDisplay = ({ 
  applicationId, 
  sttData = null,
  onDataLoad = null 
}) => {
  // 드롭다운 토글 상태 (간단 요약/상세)
  const [openSummary, setOpenSummary] = React.useState(true);
  const [openDetails, setOpenDetails] = React.useState(false);
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentSegment, setCurrentSegment] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 데이터 처리
  useEffect(() => {
    if (sttData) {
      setCurrentData(sttData);
      setError(null);
    } else {
      setCurrentData(null);
    }
  }, [sttData]);

  // 하드코딩된 JSON 데이터
  const hardcodedData = {
    59: {
      video_analysis: {
        speech_rate: 150.0,
        volume_level: 0.75,
        pronunciation_score: 0.85,
        intonation_score: 0.6,
        emotion_variation: 0.6,
        background_noise_level: 0.1,
        smile_frequency: 1.0,
        eye_contact_ratio: 0.8,
        hand_gesture: 0.5,
        nod_count: 2,
        posture_changes: 2,
        eye_aversion_count: 1,
        facial_expression_variation: 0.6,
        redundancy_score: 0.05,
        positive_word_ratio: 0.6,
        negative_word_ratio: 0.1,
        technical_term_count: 5,
        grammar_error_count: 1,
        conciseness_score: 0.7,
        creativity_score: 0.6,
        question_understanding_score: 0.8,
        conversation_flow_score: 0.75,
        total_silence_time: 1.0,
        analysis_timestamp: "2025-07-27T11:29:09.108308",
        video_path: "/tmp/tmpdhtkf46g.tmp",
        source_url: "https://drive.google.com/file/d/18dO35QTr0cHxEX8CtMtCkzfsBRes68XB/view?usp=drive_link",
        analysis_date: "2025-07-27T11:29:09.108345",
        analysis_type: "google_drive_video"
      },
      stt_analysis: {
        application_id: 59,
        total_duration: 166.57,
        speaking_time: 94.36,
        silence_ratio: 0.43,
        segment_count: 98,
        avg_segment_duration: 0.96,
        avg_energy: 0.04179999977350235,
        avg_pitch: 157.06,
        speaking_speed_wpm: 138.0,
        emotion: "긍정적",
        attitude: "중립적",
        posture: "보통",
        score: 4.2,
        feedback: "면접자는 또렷한 발음과 안정된 태도로 질문에 임했으며, 감정 표현이 자연스러웠습니다.",
        timestamp: "2025-07-27T20:10:27.035225"
      }
    },
    61: {
      video_analysis: {
        speech_rate: 145.0,
        volume_level: 0.8,
        pronunciation_score: 0.9,
        intonation_score: 0.7,
        emotion_variation: 0.5,
        background_noise_level: 0.05,
        smile_frequency: 0.8,
        eye_contact_ratio: 0.9,
        hand_gesture: 0.6,
        nod_count: 3,
        posture_changes: 1,
        eye_aversion_count: 0,
        facial_expression_variation: 0.7,
        redundancy_score: 0.03,
        positive_word_ratio: 0.7,
        negative_word_ratio: 0.05,
        technical_term_count: 7,
        grammar_error_count: 0,
        conciseness_score: 0.8,
        creativity_score: 0.7,
        question_understanding_score: 0.9,
        conversation_flow_score: 0.8,
        total_silence_time: 0.5,
        analysis_timestamp: "2025-07-27T11:30:15.123456",
        analysis_date: "2025-07-27T11:30:15.123456",
        analysis_type: "google_drive_video"
      },
      stt_analysis: {
        application_id: 61,
        total_duration: 182.17,
        speaking_time: 116.76,
        silence_ratio: 0.36,
        segment_count: 43,
        avg_segment_duration: 2.72,
        avg_energy: 0.010599999688565731,
        avg_pitch: 260.97,
        speaking_speed_wpm: 138.0,
        emotion: "부정적",
        attitude: "차분함",
        posture: "안정적",
        score: 4.2,
        feedback: "면접자는 또렷한 발음과 안정된 태도로 질문에 임했으며, 감정 표현이 자연스러웠습니다.",
        timestamp: "2025-07-27T20:23:45.313544"
      }
    },
    68: {
      video_analysis: {
        speech_rate: 140.0,
        volume_level: 0.7,
        pronunciation_score: 0.8,
        intonation_score: 0.65,
        emotion_variation: 0.55,
        background_noise_level: 0.08,
        smile_frequency: 0.9,
        eye_contact_ratio: 0.85,
        hand_gesture: 0.55,
        nod_count: 2,
        posture_changes: 2,
        eye_aversion_count: 1,
        facial_expression_variation: 0.65,
        redundancy_score: 0.04,
        positive_word_ratio: 0.65,
        negative_word_ratio: 0.08,
        technical_term_count: 6,
        grammar_error_count: 1,
        conciseness_score: 0.75,
        creativity_score: 0.65,
        question_understanding_score: 0.85,
        conversation_flow_score: 0.78,
        total_silence_time: 0.8,
        analysis_timestamp: "2025-07-27T11:31:22.789012",
        analysis_date: "2025-07-27T11:31:22.789012",
        analysis_type: "google_drive_video"
      },
      stt_analysis: {
        application_id: 68,
        total_duration: 182.17,
        speaking_time: 116.76,
        silence_ratio: 0.36,
        segment_count: 43,
        avg_segment_duration: 2.72,
        avg_energy: 0.010599999688565731,
        avg_pitch: 260.97,
        speaking_speed_wpm: 138.0,
        emotion: "부정적",
        attitude: "차분함",
        posture: "안정적",
        score: 4.2,
        feedback: "면접자는 또렷한 발음과 안정된 태도로 질문에 임했으며, 감정 표현이 자연스러웠습니다.",
        timestamp: "2025-07-27T20:27:28.868576"
      }
    }
  };

  // 데이터가 없을 때 하드코딩된 데이터 사용
  useEffect(() => {
    if (!currentData && applicationId) {
      setLoading(true);
      
      // 하드코딩된 데이터에서 해당 지원자 데이터 찾기
      const data = hardcodedData[applicationId];
      
      if (data) {
        setCurrentData({
          success: true,
          video_analysis: data.video_analysis,
          stt_analysis: data.stt_analysis,
          application_id: applicationId
        });
        console.log(`✅ ${applicationId}번 지원자 AI 면접 결과 로드 완료 (하드코딩)`);
      } else {
        setError(`${applicationId}번 지원자의 AI 면접 데이터가 없습니다.`);
      }
      
      setLoading(false);
    }
  }, [applicationId, currentData]);

  // 비디오 분석 데이터
  const videoAnalysis = useMemo(() => {
    return currentData?.video_analysis || null;
  }, [currentData]);

  // STT 분석 데이터
  const sttAnalysis = useMemo(() => {
    return currentData?.stt_analysis || null;
  }, [currentData]);

  // 분석 통계
  const analysisStats = useMemo(() => {
    if (!videoAnalysis && !sttAnalysis) return null;
    
    return {
      // 비디오 분석 통계
      speechRate: videoAnalysis?.speech_rate || 0,
      volumeLevel: videoAnalysis?.volume_level || 0,
      pronunciationScore: videoAnalysis?.pronunciation_score || 0,
      smileFrequency: videoAnalysis?.smile_frequency || 0,
      eyeContactRatio: videoAnalysis?.eye_contact_ratio || 0,
      handGesture: videoAnalysis?.hand_gesture || 0,
      
      // STT 분석 통계
      totalDuration: sttAnalysis?.total_duration || 0,
      speakingTime: sttAnalysis?.speaking_time || 0,
      silenceRatio: sttAnalysis?.silence_ratio || 0,
      segmentCount: sttAnalysis?.segment_count || 0,
      speakingSpeedWpm: sttAnalysis?.speaking_speed_wpm || 0,
      emotion: sttAnalysis?.emotion || 'N/A',
      attitude: sttAnalysis?.attitude || 'N/A',
      score: sttAnalysis?.score || 0,
      feedback: sttAnalysis?.feedback || ''
    };
  }, [videoAnalysis, sttAnalysis]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">AI 면접 결과를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <FaTimesCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">데이터 로드 실패</h3>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => onDataLoad?.(applicationId, 'ai_interview')}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
            >
              <FiRefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <MdOutlineAutoAwesome className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI 면접 결과 없음</h3>
            <p className="text-gray-600">
              AI 면접에 대한 분석 데이터가 없습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <MdOutlineAutoAwesome className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                AI 면접 분석 결과
              </h2>
              <p className="text-sm text-gray-600">비디오 분석 및 STT 분석 결과</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              지원자 ID: {applicationId}
            </span>
            <FaCheckCircle className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      {analysisStats && (
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center">
                <FiClock className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-600">총 시간</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {Math.round(analysisStats.totalDuration)}초
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center">
                <FaVolumeUp className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-green-600">말 속도</p>
                  <p className="text-lg font-semibold text-green-900">
                    {analysisStats.speakingSpeedWpm} WPM
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center">
                <FaEye className="w-5 h-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-purple-600">시선 접촉</p>
                  <p className="text-lg font-semibold text-purple-900">
                    {Math.round(analysisStats.eyeContactRatio * 100)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-center">
                <FiBarChart2 className="w-5 h-5 text-orange-600 mr-2" />
                <div>
                  <p className="text-sm text-orange-600">종합 점수</p>
                  <p className="text-lg font-semibold text-orange-900">
                    {analysisStats.score}/5.0
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'overview', label: '개요', icon: <FiBarChart2 /> },
          { id: 'video', label: '영상 분석', icon: <FiVideo /> },
          { id: 'stt', label: 'STT 분석', icon: <FaMicrophone /> },
          { id: 'feedback', label: 'AI 피드백', icon: <MdOutlinePsychology /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="ml-2">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI 면접 분석 개요</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                    <FaBrain className="w-4 h-4 mr-2" />
                    기본 정보
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>총 면접 시간:</span>
                      <span className="font-medium">{Math.round(analysisStats?.totalDuration || 0)}초</span>
                    </div>
                    <div className="flex justify-between">
                      <span>발화 시간:</span>
                      <span className="font-medium">{Math.round(analysisStats?.speakingTime || 0)}초</span>
                    </div>
                    <div className="flex justify-between">
                      <span>침묵 비율:</span>
                      <span className="font-medium">{Math.round((analysisStats?.silenceRatio || 0) * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>세그먼트 수:</span>
                      <span className="font-medium">{analysisStats?.segmentCount || 0}개</span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3 flex items-center">
                    <MdOutlineVerified className="w-4 h-4 mr-2" />
                    평가 결과
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>종합 점수:</span>
                      <span className="font-medium">{analysisStats?.score || 0}/5.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>감정 상태:</span>
                      <span className="font-medium">{analysisStats?.emotion || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>태도:</span>
                      <span className="font-medium">{analysisStats?.attitude || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>말 속도:</span>
                      <span className="font-medium">{analysisStats?.speakingSpeedWpm || 0} WPM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI 피드백 미리보기 */}
            {analysisStats?.feedback && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">AI 피드백</h4>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-gray-800 leading-relaxed">
                    {analysisStats.feedback}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">영상 분석 결과</h3>
            {videoAnalysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">음성 특성</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>말 속도:</span>
                      <span className="font-medium">{videoAnalysis.speech_rate} WPM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>음량 레벨:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.volume_level * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>발음 점수:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.pronunciation_score * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>억양 점수:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.intonation_score * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>감정 변화:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.emotion_variation * 100)}%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3">비언어적 특성</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>미소 빈도:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.smile_frequency * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>시선 접촉:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.eye_contact_ratio * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>손동작:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.hand_gesture * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>고개 끄덕임:</span>
                      <span className="font-medium">{videoAnalysis.nod_count}회</span>
                    </div>
                    <div className="flex justify-between">
                      <span>자세 변화:</span>
                      <span className="font-medium">{videoAnalysis.posture_changes}회</span>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-3">언어적 특성</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>중복성 점수:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.redundancy_score * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>긍정적 단어 비율:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.positive_word_ratio * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>부정적 단어 비율:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.negative_word_ratio * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>전문용어 수:</span>
                      <span className="font-medium">{videoAnalysis.technical_term_count}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span>문법 오류:</span>
                      <span className="font-medium">{videoAnalysis.grammar_error_count}개</span>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-3">대화 품질</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>간결성 점수:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.conciseness_score * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>창의성 점수:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.creativity_score * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>질문 이해도:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.question_understanding_score * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>대화 흐름:</span>
                      <span className="font-medium">{Math.round(videoAnalysis.conversation_flow_score * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>총 침묵 시간:</span>
                      <span className="font-medium">{videoAnalysis.total_silence_time}초</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                영상 분석 데이터가 없습니다.
              </div>
            )}
          </div>
        )}

        {activeTab === 'stt' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">STT 분석 결과</h3>
            {sttAnalysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">시간 분석</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>총 면접 시간:</span>
                      <span className="font-medium">{Math.round(sttAnalysis.total_duration)}초</span>
                    </div>
                    <div className="flex justify-between">
                      <span>실제 발화 시간:</span>
                      <span className="font-medium">{Math.round(sttAnalysis.speaking_time)}초</span>
                    </div>
                    <div className="flex justify-between">
                      <span>침묵 비율:</span>
                      <span className="font-medium">{Math.round(sttAnalysis.silence_ratio * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>평균 세그먼트 길이:</span>
                      <span className="font-medium">{sttAnalysis.avg_segment_duration.toFixed(2)}초</span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3">음성 특성</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>평균 에너지:</span>
                      <span className="font-medium">{sttAnalysis.avg_energy.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>평균 피치:</span>
                      <span className="font-medium">{Math.round(sttAnalysis.avg_pitch)} Hz</span>
                    </div>
                    <div className="flex justify-between">
                      <span>말 속도:</span>
                      <span className="font-medium">{sttAnalysis.speaking_speed_wpm} WPM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>세그먼트 수:</span>
                      <span className="font-medium">{sttAnalysis.segment_count}개</span>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-3">평가 결과</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>종합 점수:</span>
                      <span className="font-medium">{sttAnalysis.score}/5.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>감정 상태:</span>
                      <span className="font-medium">{sttAnalysis.emotion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>태도:</span>
                      <span className="font-medium">{sttAnalysis.attitude}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>자세:</span>
                      <span className="font-medium">{sttAnalysis.posture}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-3">분석 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>분석 시간:</span>
                      <span className="font-medium">
                        {new Date(sttAnalysis.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>지원자 ID:</span>
                      <span className="font-medium">{sttAnalysis.application_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                STT 분석 데이터가 없습니다.
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">AI 피드백</h3>
            {analysisStats?.feedback ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center mb-4">
                  <MdOutlinePsychology className="w-6 h-6 text-blue-600 mr-2" />
                  <h4 className="text-lg font-semibold text-blue-900">AI 면접 평가 피드백</h4>
                </div>
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {analysisStats.feedback}
                </p>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysisStats.score}/5.0</div>
                      <div className="text-gray-600">종합 점수</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{analysisStats.emotion}</div>
                      <div className="text-gray-600">감정 상태</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">{analysisStats.attitude}</div>
                      <div className="text-gray-600">면접 태도</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                AI 피드백이 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiInterviewResultDisplay; 