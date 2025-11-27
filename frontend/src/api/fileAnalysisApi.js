import api from './api';

class FileAnalysisApi {
  /**
   * 파일 분석 요청
   * @param {Object} data - 분석 요청 데이터
   * @param {number} data.application_id - 지원자 ID
   * @param {string} data.analysis_type - 분석 타입 ('video' 또는 'audio')
   * @param {File} data.file - 업로드할 파일 (선택사항)
   * @param {string} data.drive_url - 구글드라이브 URL (선택사항)
   * @returns {Promise<Object>} 분석 결과
   */
  static async analyzeFile(data) {
    const formData = new FormData();
    formData.append('application_id', data.application_id);
    formData.append('analysis_type', data.analysis_type);
    
    if (data.file) {
      formData.append('file', data.file);
    } else if (data.drive_url) {
      formData.append('drive_url', data.drive_url);
    }
    
    const response = await api.post('/file-analysis/analyze-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5분 타임아웃
    });
    
    return response.data;
  }

  /**
   * 분석 결과 조회
   * @param {number} analysis_id - 분석 ID
   * @returns {Promise<Object>} 분석 결과
   */
  static async getAnalysisResult(analysis_id) {
    const response = await api.get(`/file-analysis/analysis-result/${analysis_id}`);
    return response.data;
  }

  /**
   * 지원자의 분석 상태 조회
   * @param {number} application_id - 지원자 ID
   * @returns {Promise<Object>} 분석 상태 목록
   */
  static async getAnalysisStatus(application_id) {
    const response = await api.get(`/file-analysis/analysis-status/${application_id}`);
    return response.data;
  }

  /**
   * 수동으로 JSON 파일을 DB에 업로드
   * @param {number} application_id - 지원자 ID
   * @returns {Promise<Object>} 업로드 결과
   */
  static async forceUpload(application_id) {
    const response = await api.post(`/file-analysis/force-upload/${application_id}`);
    return response.data;
  }

  /**
   * 오래된 JSON 파일 정리
   * @param {number} days - 정리할 일수 (기본값: 7일)
   * @returns {Promise<Object>} 정리 결과
   */
  static async cleanupOldFiles(days = 7) {
    const response = await api.delete(`/file-analysis/cleanup-old-files?days=${days}`);
    return response.data;
  }

  /**
   * 구글드라이브 URL 유효성 검사
   * @param {string} url - 구글드라이브 URL
   * @returns {boolean} 유효성 여부
   */
  static validateDriveUrl(url) {
    return url.includes('drive.google.com') && 
           (url.includes('/file/d/') || url.includes('/d/') || url.includes('id='));
  }

  /**
   * 파일 형식 검증
   * @param {File} file - 검증할 파일
   * @param {string} analysis_type - 분석 타입
   * @returns {boolean} 유효성 여부
   */
  static validateFileFormat(file, analysis_type) {
    const allowedVideoFormats = ['.mp4', '.avi', '.mov', '.wmv'];
    const allowedAudioFormats = ['.mp3', '.wav', '.m4a'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    const allowedFormats = analysis_type === 'video' ? allowedVideoFormats : allowedAudioFormats;
    return allowedFormats.includes(fileExtension);
  }

  /**
   * 파일 크기 검증
   * @param {File} file - 검증할 파일
   * @param {number} maxSizeMB - 최대 파일 크기 (MB)
   * @returns {boolean} 유효성 여부
   */
  static validateFileSize(file, maxSizeMB = 500) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}

export default FileAnalysisApi; 