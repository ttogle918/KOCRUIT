import React, { useState, useEffect } from 'react';
import { 
  MdOutlinePsychology, 
  MdOutlineRecordVoiceOver,
  MdOutlineEmojiEmotions,
  MdOutlineAnalytics,
  MdOutlineSpeakerNotes,
  MdOutlineAssessment
} from 'react-icons/md';
import { FaBrain, FaSmile, FaChartLine } from 'react-icons/fa';

const DetailedWhisperAnalysis = ({ applicationId }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysisData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v2/whisper-analysis/status/${applicationId}`);
      const data = await response.json();
      
      if (data.has_analysis) {
        setAnalysisData(data);
      } else {
        setError('Whisper 분석 데이터가 없습니다.');
      }
    } catch (err) {
      setError('분석 데이터를 불러오는데 실패했습니다.');
      console.error('Whisper 분석 데이터 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchAnalysisData();
    }
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">상세 분석 데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg">
        <div className="text-red-600 text-lg mb-2">⚠️</div>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <div className="text-gray-400 text-lg mb-2">📊</div>
        <p className="text-gray-600">Whisper 분석 데이터가 없습니다.</p>
      </div>
    );
  }

  const { 
    transcription, 
    score, 
    emotion_analysis, 
    speaker_analysis, 
    context_analysis,
    analysis_method 
  } = analysisData;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MdOutlineRecordVoiceOver className="text-blue-600" />
              상세 Whisper 분석 결과
            </h3>
            <p className="text-gray-600 mt-1">
              생성일: {new Date(analysisData.created_at).toLocaleString()} | 
              분석 방법: {analysis_method || 'unknown'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{score || 'N/A'}</div>
            <div className="text-sm text-gray-500">종합 점수</div>
          </div>
        </div>
      </div>

      {/* 전사 결과 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <MdOutlineSpeakerNotes className="text-green-600" />
          음성 전사 결과
        </h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {transcription || '전사 데이터가 없습니다.'}
          </p>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          총 {transcription?.length || 0}자
        </div>
      </div>

      {/* 감정분석 결과 */}
      {emotion_analysis && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <MdOutlineEmojiEmotions className="text-purple-600" />
            감정분석 결과
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 주요 감정 */}
            <div>
              <h5 className="font-medium text-gray-700 mb-3">주요 감정</h5>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {emotion_analysis.primary_emotion || '분석 불가'}
                </div>
                <p className="text-purple-700 text-sm">
                  {emotion_analysis.emotional_tone || '감정 톤 분석 불가'}
                </p>
              </div>
            </div>

            {/* 감정 세부 분석 */}
            <div>
              <h5 className="font-medium text-gray-700 mb-3">감정 세부 분석</h5>
              <div className="space-y-3">
                {emotion_analysis.emotion_breakdown && Object.entries(emotion_analysis.emotion_breakdown).map(([emotion, score]) => (
                  <div key={emotion} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{emotion}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-8">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 감정 인사이트 */}
          {emotion_analysis.emotional_insights && (
            <div className="mt-6">
              <h5 className="font-medium text-gray-700 mb-3">감정 인사이트</h5>
              <div className="bg-blue-50 p-4 rounded-lg">
                <ul className="space-y-2">
                  {emotion_analysis.emotional_insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-blue-800">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 권장사항 */}
          {emotion_analysis.recommendations && (
            <div className="mt-6">
              <h5 className="font-medium text-gray-700 mb-3">개선 권장사항</h5>
              <div className="bg-green-50 p-4 rounded-lg">
                <ul className="space-y-2">
                  {emotion_analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">💡</span>
                      <span className="text-green-800">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 화자 분석 결과 */}
      {speaker_analysis && speaker_analysis.speaker_detection && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <MdOutlinePsychology className="text-indigo-600" />
            화자 분리 분석
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-gray-700 mb-3">화자 통계</h5>
              <div className="space-y-3">
                {speaker_analysis.speaker_detection.speakers && 
                  speaker_analysis.speaker_detection.speakers.slice(0, 5).map((speaker, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-700">
                          {speaker.speaker || `화자 ${index + 1}`}
                        </span>
                        <div className="text-sm text-gray-500">
                          {speaker.duration?.toFixed(1) || 0}초
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">
                          {speaker.segments || 0}개 세그먼트
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-3">분석 방법</h5>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-indigo-700 font-medium">
                  {speaker_analysis.speaker_detection.method || 'unknown'}
                </div>
                <div className="text-sm text-indigo-600 mt-1">
                  {speaker_analysis.speaker_detection.method === 'pyannote.audio' 
                    ? '고급 화자 분리 알고리즘 사용' 
                    : '기본 화자 분리 방법 사용'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 문맥 분석 결과 */}
      {context_analysis && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <MdOutlineAnalytics className="text-orange-600" />
            문맥 분석 결과
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {context_analysis.evaluation && Object.entries(context_analysis.evaluation).map(([skill, score]) => (
              <div key={skill} className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-600 font-medium capitalize mb-2">
                  {skill.replace('_', ' ')}
                </div>
                <div className="text-2xl font-bold text-orange-700">{score || 'N/A'}</div>
                <div className="text-xs text-orange-600">점수</div>
              </div>
            ))}
          </div>

          {/* 질문-답변 쌍 */}
          {context_analysis.qa_pairs && context_analysis.qa_pairs.length > 0 && (
            <div className="mt-6">
              <h5 className="font-medium text-gray-700 mb-3">질문-답변 분석</h5>
              <div className="space-y-4">
                {context_analysis.qa_pairs.map((qa, index) => (
                  <div key={index} className="border-l-4 border-orange-500 pl-4">
                    <div className="mb-2">
                      <div className="text-sm text-gray-500">질문 {index + 1}</div>
                      <div className="text-gray-800 font-medium">{qa.question}</div>
                    </div>
                    <div className="mb-2">
                      <div className="text-sm text-gray-500">답변</div>
                      <div className="text-gray-700">{qa.answer}</div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-orange-600 font-medium">
                        답변 품질: {qa.answer_quality || 'N/A'}점
                      </span>
                      <span className="text-gray-500">
                        분석: {qa.speaker_analysis || 'unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 새로고침 버튼 */}
      <div className="text-center">
        <button
          onClick={fetchAnalysisData}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          데이터 새로고침
        </button>
      </div>
    </div>
  );
};

export default DetailedWhisperAnalysis;
