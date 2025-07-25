/**
 * Google Drive 연동 유틸리티
 */

// Google Drive 공유 링크를 직접 재생 가능한 URL로 변환
export const convertDriveUrlToDirect = (shareUrl) => {
  const videoId = extractVideoIdFromUrl(shareUrl);
  if (!videoId) {
    throw new Error('유효하지 않은 Google Drive 링크입니다.');
  }
  
  // 직접 재생 가능한 URL 생성
  return `https://drive.google.com/uc?export=download&id=${videoId}`;
};

// Google Drive URL에서 파일 ID 추출
export const extractVideoIdFromUrl = (url) => {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// 디렉토리 공유 URL에서 폴더 ID 추출
export const extractFolderIdFromUrl = (url) => {
  const patterns = [
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// URL이 파일인지 폴더인지 판단
export const getDriveItemType = (url) => {
  if (url.includes('/file/d/')) {
    return 'file';
  } else if (url.includes('/folders/')) {
    return 'folder';
  } else if (url.includes('/drive/folders/')) {
    return 'folder';
  }
  return 'unknown';
};

// 폴더 내 동영상 파일 목록 조회 (Google Drive API 사용)
export const getVideoFilesFromFolder = async (folderId, apiKey) => {
  if (!apiKey) {
    console.warn('Google Drive API 키가 필요합니다.');
    return [];
  }
  
  try {
    // 폴더 내 파일 목록 조회
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+(mimeType+contains+'video/')&key=${apiKey}&fields=files(id,name,mimeType,size,createdTime)`
    );
    
    if (!response.ok) {
      throw new Error('폴더 조회 실패');
    }
    
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('폴더 내 동영상 파일 조회 오류:', error);
    return [];
  }
};

// 폴더 공유 URL로부터 동영상 파일 목록 가져오기
export const getVideosFromSharedFolder = async (folderUrl, apiKey) => {
  const folderId = extractFolderIdFromUrl(folderUrl);
  if (!folderId) {
    throw new Error('유효하지 않은 폴더 공유 링크입니다.');
  }
  
  return await getVideoFilesFromFolder(folderId, apiKey);
};

// Google Drive 파일 정보 가져오기 (API 키 필요 시)
export const getDriveFileInfo = async (fileId, apiKey) => {
  if (!apiKey) return null;
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?key=${apiKey}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Google Drive API 오류:', error);
    return null;
  }
};

// 지원하는 동영상 형식 확인
export const isSupportedVideoFormat = (filename) => {
  const supportedFormats = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return supportedFormats.includes(extension);
};

// Google Drive 링크 유효성 검사
export const validateDriveUrl = (url) => {
  return url.includes('drive.google.com') && 
         (extractVideoIdFromUrl(url) !== null || extractFolderIdFromUrl(url) !== null);
};

// 파일 크기 포맷팅
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 날짜 포맷팅
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 