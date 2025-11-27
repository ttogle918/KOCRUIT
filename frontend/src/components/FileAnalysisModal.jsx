import React, { useState, useRef, useEffect } from 'react';
import { 
  FaUpload, 
  FaLink, 
  FaPlay, 
  FaPause, 
  FaCheck, 
  FaTimes,
  FaSpinner,
  FaFileVideo,
  FaFileAudio,
  FaGoogleDrive,
  FaChartBar,
  FaEye
} from 'react-icons/fa';
import FileAnalysisApi from '../api/fileAnalysisApi';

const FileAnalysisModal = ({ 
  isOpen, 
  onClose, 
  applicationId, 
  onAnalysisComplete 
}) => {
  const [analysisType, setAnalysisType] = useState('video');
  const [inputMethod, setInputMethod] = useState('upload'); // 'upload' or 'drive'
  const [selectedFile, setSelectedFile] = useState(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, pending, completed, failed
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 파일 형식 검증
      const allowedVideoFormats = ['.mp4', '.avi', '.mov', '.wmv'];
      const allowedAudioFormats = ['.mp3', '.wav', '.m4a'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      const allowedFormats = analysisType === 'video' ? allowedVideoFormats : allowedAudioFormats;
      
      if (!allowedFormats.includes(fileExtension)) {
        setError(`지원하지 않는 파일 형식입니다. ${analysisType === 'video' ? 'MP4, AVI, MOV, WMV' : 'MP3, WAV, M4A'} 형식을 사용해주세요.`);
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const validateDriveUrl = (url) => {
    return url.includes('drive.google.com') && 
           (url.includes('/file/d/') || url.includes('/d/') || url.includes('id='));
  };

  const handleDriveUrlChange = (event) => {
    const url = event.target.value;
    setDriveUrl(url);
    
    if (url && !validateDriveUrl(url)) {
      setError('유효하지 않은 구글드라이브 URL입니다.');
    } else {
      setError('');
    }
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);
    return interval;
  };

  const handleAnalysis = async () => {
    if (isAnalyzing) return;

    // 입력 검증
    if (inputMethod === 'upload' && !selectedFile) {
      setError('파일을 선택해주세요.');
      return;
    }
    
    if (inputMethod === 'drive' && !driveUrl) {
      setError('구글드라이브 URL을 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setProgress(0);
    setAnalysisResult(null);
    setUploadStatus('idle');

    const progressInterval = simulateProgress();

    try {
      const analysisData = {
        application_id: applicationId,
        analysis_type: analysisType
      };

      if (inputMethod === 'upload') {
        analysisData.file = selectedFile;
      } else {
        analysisData.drive_url = driveUrl;
      }

      const response = await FileAnalysisApi.analyzeFile(analysisData);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.success) {
        setAnalysisResult(response.result);
        setUploadStatus(response.upload_status || 'pending');
        
        if (onAnalysisComplete) {
          onAnalysisComplete(response);
        }
      } else {
        setError('분석 중 오류가 발생했습니다.');
      }

    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('분석 중 오류가 발생했습니다.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkUploadStatus = async () => {
    if (uploadStatus !== 'pending') return;
    
    try {
      const response = await FileAnalysisApi.getAnalysisStatus(applicationId);
      
      // DB에 업로드된 분석이 있는지 확인
      const completedAnalyses = response.database_records || [];
      const currentAnalysis = completedAnalyses.find(
        analysis => analysis.analysis_type === analysisType
      );
      
      if (currentAnalysis) {
        setUploadStatus('completed');
      }
      
    } catch (error) {
      console.error('업로드 상태 확인 실패:', error);
    }
  };

  // 업로드 상태 주기적 확인
  useEffect(() => {
    if (uploadStatus === 'pending') {
      const interval = setInterval(checkUploadStatus, 5000); // 5초마다 확인
      return () => clearInterval(interval);
    }
  }, [uploadStatus, applicationId, analysisType]);

  const resetForm = () => {
    setSelectedFile(null);
    setDriveUrl('');
    setError('');
    setProgress(0);
    setAnalysisResult(null);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FaChartBar className="text-blue-500" />
            파일 분석
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* 분석 타입 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            분석 타입
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="video"
                checked={analysisType === 'video'}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="mr-2"
              />
              <FaFileVideo className="text-red-500 mr-1" />
              영상 분석
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="audio"
                checked={analysisType === 'audio'}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="mr-2"
              />
              <FaFileAudio className="text-green-500 mr-1" />
              오디오 분석
            </label>
          </div>
        </div>

        {/* 입력 방법 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            파일 입력 방법
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="upload"
                checked={inputMethod === 'upload'}
                onChange={(e) => setInputMethod(e.target.value)}
                className="mr-2"
              />
              <FaUpload className="text-blue-500 mr-1" />
              파일 업로드
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="drive"
                checked={inputMethod === 'drive'}
                onChange={(e) => setInputMethod(e.target.value)}
                className="mr-2"
              />
              <FaGoogleDrive className="text-green-500 mr-1" />
              구글드라이브 URL
            </label>
          </div>
        </div>

        {/* 파일 입력 영역 */}
        <div className="mb-6">
          {inputMethod === 'upload' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                파일 선택
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept={analysisType === 'video' ? 'video/*' : 'audio/*'}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <FaUpload />
                  파일 선택
                </button>
                {selectedFile && (
                  <div className="mt-4 text-sm text-gray-600">
                    선택된 파일: {selectedFile.name}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                구글드라이브 URL
              </label>
              <input
                type="url"
                value={driveUrl}
                onChange={handleDriveUrlChange}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                구글드라이브 공유 링크를 입력해주세요.
              </p>
            </div>
          )}
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* 분석 버튼 */}
        <div className="mb-6">
          <button
            onClick={handleAnalysis}
            disabled={isAnalyzing}
            className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              isAnalyzing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isAnalyzing ? (
              <>
                <FaSpinner className="animate-spin" />
                분석 중... ({progress}%)
              </>
            ) : (
              <>
                <FaPlay />
                분석 시작
              </>
            )}
          </button>
        </div>

        {/* 진행률 바 */}
        {isAnalyzing && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 분석 결과 */}
        {analysisResult && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaCheck className="text-green-500" />
              분석 완료
            </h3>
            
            {/* 업로드 상태 표시 */}
            <div className="mb-4">
              {uploadStatus === 'pending' && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <FaSpinner className="animate-spin text-yellow-500" />
                  <span className="text-yellow-700">분석 결과를 DB에 업로드 중...</span>
                </div>
              )}
              {uploadStatus === 'completed' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FaCheck className="text-green-500" />
                  <span className="text-green-700">DB 업로드 완료!</span>
                </div>
              )}
              {uploadStatus === 'failed' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <FaTimes className="text-red-500" />
                  <span className="text-red-700">DB 업로드 실패</span>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisType === 'video' && (
                  <>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">음성 분석</h4>
                      <div className="space-y-1 text-sm">
                        <div>말 속도: {analysisResult.speech_rate?.toFixed(1) || 'N/A'} WPM</div>
                        <div>음성 볼륨: {analysisResult.volume_level?.toFixed(2) || 'N/A'}</div>
                        <div>발음 정확도: {analysisResult.pronunciation_score?.toFixed(2) || 'N/A'}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">영상 분석</h4>
                      <div className="space-y-1 text-sm">
                        <div>미소 빈도: {analysisResult.smile_frequency?.toFixed(2) || 'N/A'}</div>
                        <div>시선 접촉: {analysisResult.eye_contact_ratio?.toFixed(2) || 'N/A'}</div>
                        <div>손동작: {analysisResult.hand_gesture?.toFixed(2) || 'N/A'}</div>
                      </div>
                    </div>
                  </>
                )}
                
                {analysisType === 'audio' && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">음성 인식 결과</h4>
                    <div className="text-sm text-gray-600">
                      {analysisResult.transcription?.text || '음성 인식 결과가 없습니다.'}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <FaEye />
                  상세 결과 보기
                </button>
                
                {uploadStatus === 'pending' && (
                  <button
                    onClick={async () => {
                      try {
                        await FileAnalysisApi.forceUpload(applicationId);
                        setUploadStatus('completed');
                      } catch (error) {
                        console.error('수동 업로드 실패:', error);
                      }
                    }}
                    className="text-orange-500 hover:text-orange-700 text-sm flex items-center gap-1"
                  >
                    <FaUpload />
                    수동 업로드
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileAnalysisModal; 