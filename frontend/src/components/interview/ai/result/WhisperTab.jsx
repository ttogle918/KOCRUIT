import React from 'react';
import AiInterviewApi from '../../../../api/aiInterviewApi';

/**
 * STT 분석 결과 (Whisper) 탭 컴포넌트
 */
const WhisperTab = ({ 
  applicant, 
  interviewData, 
  setInterviewData, 
  setShowDetailedWhisperAnalysis 
}) => {
  return (
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
                    <div className="text-gray-700 leading-relaxed space-y-1">
                      {(() => {
                        const feedback = interviewData.whisperAnalysis.analysis?.feedback;
                        if (!feedback) return '피드백이 없습니다.';
                        
                        try {
                          const parsed = typeof feedback === 'string' && (feedback.startsWith('[') || feedback.startsWith('{'))
                            ? JSON.parse(feedback) 
                            : feedback;
                          
                          if (Array.isArray(parsed)) {
                            return parsed.map((msg, i) => (
                              <p key={i} className="flex items-start gap-2">
                                <span className="text-yellow-600 mt-1">•</span>
                                <span>{msg}</span>
                              </p>
                            ));
                          }
                          return <p>{feedback}</p>;
                        } catch (e) {
                          return <p>{feedback}</p>;
                        }
                      })()}
                    </div>
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
                  const response = await AiInterviewApi.getWhisperStatus(applicant.application_id);
                  console.log('STT 응답:', response);
                  if (response.has_analysis) {
                    const whisperData = {
                      analysis: {
                        transcription: response.transcription,
                        score: response.score,
                        timestamp: response.created_at,
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
                    console.error('STT 데이터 로드 실패:', response.message);
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
                    const response = await AiInterviewApi.getWhisperStatus(applicant.application_id);
                    console.log('Whisper 상태:', response);
                    
                    if (response.has_analysis) {
                      alert(`Whisper 분석 완료!\n생성일: ${new Date(response.created_at).toLocaleString()}\n전사 길이: ${response.transcription_length}자\n점수: ${response.score}점`);
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
  );
};

export default WhisperTab;

