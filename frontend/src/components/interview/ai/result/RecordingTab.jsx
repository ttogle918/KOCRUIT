import React from 'react';
import { MdOutlineRecordVoiceOver } from 'react-icons/md';
import AiInterviewApi from '../../../../api/aiInterviewApi';
import videoAnalysisApi from '../../../../api/videoAnalysisApi';
import AudioRecorder from '../../../common/AudioRecorder';
import AudioUploader from '../../../common/AudioUploader';

/**
 * 실시간 녹음 및 분석 탭 컴포넌트
 */
const RecordingTab = ({ 
  applicant, 
  loadInterviewData 
}) => {
  return (
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
                      const response = await AiInterviewApi.getWhisperStatus(applicant.application_id);
                      console.log('Whisper 상태:', response);
                      alert(`Whisper 분석 상태: ${JSON.stringify(response, null, 2)}`);
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
                      const response = await AiInterviewApi.getQaAnalysis(applicant.id);
                      console.log('QA 분석 결과:', response);
                      alert(`QA 분석 결과: ${JSON.stringify(response, null, 2)}`);
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
                      // videoAnalysisApi 사용
                      const response = await videoAnalysisApi.get(`/video-analysis/status/${applicant.application_id}`);
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
  );
};

export default RecordingTab;

