import React, { useState, useRef, useCallback } from 'react';
import { 
  FaUpload, 
  FaFileAudio, 
  FaTrash, 
  FaSpinner,
  FaPlay,
  FaPause,
  FaStop
} from 'react-icons/fa';
import { MdOutlineAnalytics, MdOutlineCloudUpload } from 'react-icons/md';
import api from '../../api/api';

const AudioUploader = ({ 
  applicationId, 
  onUploadComplete, 
  onAnalysisComplete,
  interviewType = 'practical',
  className = ''
}) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  const fileInputRef = useRef(null);
  const audioRefs = useRef({});

  // 파일 유효성 검사
  const isValidAudioFile = (file) => {
    const validTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/aac'
    ];
    return validTypes.includes(file.type) || file.name.match(/\.(webm|mp3|wav|ogg|m4a|aac)$/i);
  };

  // 파일 크기 제한 (50MB)
  const isValidFileSize = (file) => {
    return file.size <= 50 * 1024 * 1024;
  };

  // 파일 추가
  const addFiles = useCallback((files) => {
    const newFiles = Array.from(files).filter(file => {
      if (!isValidAudioFile(file)) {
        setError(`${file.name}은(는) 지원되지 않는 오디오 파일 형식입니다.`);
        return false;
      }
      if (!isValidFileSize(file)) {
        setError(`${file.name}의 파일 크기가 너무 큽니다. (최대 50MB)`);
        return false;
      }
      return true;
    });

    if (newFiles.length > 0) {
      setError(null);
      const filesWithId = newFiles.map((file, index) => ({
        id: Date.now() + index,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        status: 'ready' // ready, uploading, uploaded, analyzing, completed, error
      }));
      
      setUploadedFiles(prev => [...prev, ...filesWithId]);
    }
  }, []);

  // 파일 제거
  const removeFile = useCallback((fileId) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  // 파일 선택
  const handleFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(e.target.files);
    }
  }, [addFiles]);

  // 파일 업로드
  const uploadFile = useCallback(async (fileData) => {
    if (!applicationId) {
      setError('지원자 ID가 없습니다.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio_file', fileData.file, fileData.name);
      formData.append('application_id', applicationId);
      formData.append('interview_type', interviewType);

      // 업로드 상태 업데이트
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'uploading' }
            : f
        )
      );

      const response = await api.post('/whisper-analysis/process-qa', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5분 타임아웃
      });

      if (response.data.success) {
        // 업로드 성공 상태 업데이트
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'uploaded', uploadResult: response.data }
              : f
          )
        );
        
        onUploadComplete?.(fileData, response.data);
      } else {
        throw new Error(response.data.message || '업로드 실패');
      }
    } catch (err) {
      console.error('파일 업로드 실패:', err);
      setError(`파일 업로드 실패: ${err.message}`);
      
      // 에러 상태 업데이트
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'error', error: err.message }
            : f
        )
      );
    }
  }, [applicationId, interviewType, onUploadComplete]);

  // 모든 파일 업로드
  const uploadAllFiles = useCallback(async () => {
    const readyFiles = uploadedFiles.filter(f => f.status === 'ready');
    if (readyFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      // 순차적으로 업로드
      for (const fileData of readyFiles) {
        await uploadFile(fileData);
      }
    } catch (err) {
      console.error('일괄 업로드 실패:', err);
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles, uploadFile]);

  // 파일 분석
  const analyzeFile = useCallback(async (fileData) => {
    if (fileData.status !== 'uploaded') return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // 분석 상태 업데이트
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'analyzing' }
            : f
        )
      );

      // 분석 결과가 이미 있으면 바로 사용
      if (fileData.uploadResult) {
        setAnalysisResult(fileData.uploadResult);
        onAnalysisComplete?.(fileData.uploadResult);
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'completed' }
              : f
          )
        );
      }
    } catch (err) {
      console.error('파일 분석 실패:', err);
      setError(`분석 실패: ${err.message}`);
      
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'error', error: err.message }
            : f
        )
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [onAnalysisComplete]);

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 상태별 아이콘 및 색상
  const getStatusInfo = (status) => {
    switch (status) {
      case 'ready':
        return { icon: FaFileAudio, color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'uploading':
        return { icon: FaSpinner, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case 'uploaded':
        return { icon: MdOutlineCloudUpload, color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'analyzing':
        return { icon: FaSpinner, color: 'text-purple-600', bgColor: 'bg-purple-100' };
      case 'completed':
        return { icon: MdOutlineAnalytics, color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'error':
        return { icon: FaTrash, color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { icon: FaFileAudio, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FaUpload className="mr-2 text-blue-600" />
          기존 녹음 파일 업로드
        </h3>
        <span className="text-sm text-gray-500">
          {interviewType === 'practical' ? '실무진' : '임원진'} 면접
        </span>
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <MdOutlineCloudUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg text-gray-600 mb-2">
          오디오 파일을 여기에 드래그하거나 클릭하여 선택하세요
        </p>
        <p className="text-sm text-gray-500 mb-4">
          지원 형식: WEBM, MP3, WAV, OGG, M4A, AAC (최대 50MB)
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          파일 선택
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">업로드된 파일 ({uploadedFiles.length})</h4>
            <button
              onClick={uploadAllFiles}
              disabled={isUploading || uploadedFiles.filter(f => f.status === 'ready').length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <FaSpinner className="mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                '모두 업로드'
              )}
            </button>
          </div>

          <div className="space-y-3">
            {uploadedFiles.map((fileData) => {
              const StatusIcon = getStatusInfo(fileData.status).icon;
              const statusColor = getStatusInfo(fileData.status).color;
              const statusBgColor = getStatusInfo(fileData.status).bgColor;

              return (
                <div key={fileData.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${statusBgColor}`}>
                        <StatusIcon className={`h-5 w-5 ${statusColor} ${
                          fileData.status === 'uploading' || fileData.status === 'analyzing' 
                            ? 'animate-spin' 
                            : ''
                        }`} />
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-gray-900">{fileData.name}</h5>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(fileData.size)} • {fileData.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* 오디오 재생 컨트롤 */}
                      {fileData.url && (
                        <audio
                          ref={el => audioRefs.current[fileData.id] = el}
                          src={fileData.url}
                          className="hidden"
                        />
                      )}
                      
                      {fileData.url && (
                        <button
                          onClick={() => {
                            const audio = audioRefs.current[fileData.id];
                            if (audio) {
                              if (audio.paused) {
                                audio.play();
                              } else {
                                audio.pause();
                              }
                            }
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="재생/일시정지"
                        >
                          <FaPlay className="h-4 w-4" />
                        </button>
                      )}

                      {/* 상태별 액션 버튼 */}
                      {fileData.status === 'ready' && (
                        <button
                          onClick={() => uploadFile(fileData)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          업로드
                        </button>
                      )}

                      {fileData.status === 'uploaded' && (
                        <button
                          onClick={() => analyzeFile(fileData)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          분석
                        </button>
                      )}

                      {fileData.status === 'completed' && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">
                          완료
                        </span>
                      )}

                      {fileData.status === 'error' && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded">
                          오류
                        </span>
                      )}

                      {/* 파일 제거 */}
                      <button
                        onClick={() => removeFile(fileData.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="제거"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 상태 메시지 */}
                  {fileData.status === 'error' && fileData.error && (
                    <p className="mt-2 text-sm text-red-600">{fileData.error}</p>
                  )}

                  {fileData.status === 'completed' && (
                    <p className="mt-2 text-sm text-green-600">
                      ✅ 분석이 완료되었습니다. 상단의 'STT 분석 결과' 탭에서 결과를 확인할 수 있습니다.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 분석 결과 */}
      {analysisResult && (
        <div className="mt-6 bg-green-50 rounded-lg border border-green-200 p-4">
          <h4 className="font-medium text-green-900 mb-3 flex items-center">
            <MdOutlineAnalytics className="mr-2" />
            분석 완료
          </h4>
          <div className="text-sm text-green-700">
            <p>✅ 음성 인식 및 분석이 완료되었습니다.</p>
            <p className="mt-1">분석 결과는 상단의 'STT 분석 결과' 탭에서 확인할 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div className="mt-4 bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* 사용법 안내 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">📋 사용법</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>드래그 앤 드롭</strong>으로 오디오 파일을 업로드하거나 파일 선택 버튼을 클릭하세요.</li>
          <li>• <strong>업로드</strong> 버튼을 클릭하여 파일을 서버에 전송합니다.</li>
          <li>• <strong>분석</strong> 버튼을 클릭하여 업로드된 오디오를 AI로 분석합니다.</li>
          <li>• <strong>재생</strong> 버튼으로 업로드된 오디오를 미리 들어볼 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioUploader;
