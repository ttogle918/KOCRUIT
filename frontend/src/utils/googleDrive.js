/**
 * Google Drive 연동 유틸리티
 */

// Google Drive 공유 링크를 직접 재생 가능한 URL로 변환 (개선된 버전)
export const convertDriveUrlToDirect = (shareUrl) => {
  if (!shareUrl) return null;
  
  const videoId = extractVideoIdFromUrl(shareUrl);
  if (!videoId) {
    console.error('유효하지 않은 Google Drive 링크:', shareUrl);
    return null;
  }
  
  // 여러 가지 직접 재생 가능한 URL 형식 시도
  const directUrls = [
    `https://drive.google.com/uc?export=download&id=${videoId}`,
    `https://drive.google.com/uc?export=view&id=${videoId}`,
    `https://drive.google.com/file/d/${videoId}/preview`,
    `https://drive.google.com/uc?id=${videoId}&export=download`,
    `https://drive.google.com/file/d/${videoId}/view`,
    `https://drive.google.com/uc?export=download&confirm=t&id=${videoId}`
  ];
  
  return directUrls[0]; // 첫 번째 형식 반환
};

// Google Drive URL에서 파일 ID 추출 (개선된 버전)
export const extractVideoIdFromUrl = (url) => {
  if (!url) return null;
  
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /\/view\?usp=sharing&id=([a-zA-Z0-9-_]+)/,
    /\/edit\?usp=sharing&id=([a-zA-Z0-9-_]+)/,
    /\/preview\?id=([a-zA-Z0-9-_]+)/,
    /\/open\?id=([a-zA-Z0-9-_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  // URL에서 직접 ID 추출 시도
  try {
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const id = urlParams.get('id');
    if (id) return id;
  } catch (error) {
    console.warn('URL 파싱 실패:', error);
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

// 동영상 URL 유효성 검사 및 변환
export const processVideoUrl = async (url) => {
  if (!url) return null;
  
  try {
    console.log('🔍 동영상 URL 처리 시작:', url);
    
    // 이미 직접 URL인 경우
    if (url.includes('drive.google.com/uc') || url.includes('drive.google.com/file/d/')) {
      console.log('✅ 이미 직접 URL 형식:', url);
      return url;
    }
    
    // Google Drive 공유 링크인 경우
    if (url.includes('drive.google.com')) {
      const videoId = extractVideoIdFromUrl(url);
      if (!videoId) {
        console.error('❌ Google Drive 파일 ID 추출 실패:', url);
        return null;
      }
      
      // 여러 가지 직접 재생 가능한 URL 형식 시도
      const directUrls = [
        `https://drive.google.com/uc?export=download&id=${videoId}`,
        `https://drive.google.com/uc?export=view&id=${videoId}`,
        `https://drive.google.com/file/d/${videoId}/preview`,
        `https://drive.google.com/uc?id=${videoId}&export=download`,
        `https://drive.google.com/file/d/${videoId}/view`,
        `https://drive.google.com/uc?export=download&confirm=t&id=${videoId}`
      ];
      
      // 첫 번째 형식 반환 (브라우저에서 처리)
      console.log('✅ Google Drive URL 변환 완료:', directUrls[0]);
      return directUrls[0];
    }
    
    // 다른 클라우드 스토리지 URL들
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // YouTube URL 처리
      return processYouTubeUrl(url);
    }
    
    // 일반 HTTP/HTTPS URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('✅ 일반 URL 사용:', url);
      return url;
    }
    
    console.error('❌ 지원하지 않는 URL 형식:', url);
    return null;
    
  } catch (error) {
    console.error('❌ URL 처리 중 오류:', error);
    return null;
  }
};

// YouTube URL 처리
export const processYouTubeUrl = (url) => {
  const videoId = extractYouTubeVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
};

// YouTube URL에서 비디오 ID 추출
export const extractYouTubeVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9-_]+)/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9-_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// 동영상 파일 다운로드 및 임시 저장 (백엔드 API 호출)
export const downloadAndCacheVideo = async (url, applicationId) => {
  try {
    const response = await fetch('/api/v1/interview-questions/download-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: url,
        application_id: applicationId
      })
    });
    
    if (!response.ok) {
      throw new Error('동영상 다운로드 실패');
    }
    
    const data = await response.json();
    return data.cached_url;
    
  } catch (error) {
    console.error('동영상 다운로드 오류:', error);
    return null;
  }
};

// 동영상 URL 테스트 (간단한 버전)
export const testVideoUrl = async (url) => {
  try {
    const processedUrl = await processVideoUrl(url);
    return !!processedUrl;
  } catch (error) {
    console.error('동영상 URL 테스트 실패:', error);
    return false;
  }
}; 