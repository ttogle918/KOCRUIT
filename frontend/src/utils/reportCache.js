// 보고서 데이터 캐시 유틸리티
const CACHE_PREFIX = 'report_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24시간

/**
 * 캐시 키 생성
 * @param {string} reportType - 보고서 타입 (document, written, interview)
 * @param {string} jobPostId - 공고 ID
 * @returns {string} 캐시 키
 */
const getCacheKey = (reportType, jobPostId) => {
  return `${CACHE_PREFIX}${reportType}_${jobPostId}`;
};

/**
 * 캐시에 데이터 저장
 * @param {string} reportType - 보고서 타입
 * @param {string} jobPostId - 공고 ID
 * @param {any} data - 저장할 데이터
 */
export const setReportCache = (reportType, jobPostId, data) => {
  try {
    const cacheKey = getCacheKey(reportType, jobPostId);
    const cacheData = {
      data,
      timestamp: Date.now(),
      jobPostId
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`📦 ${reportType} 보고서 캐시 저장 완료:`, cacheKey);
  } catch (error) {
    console.error('캐시 저장 실패:', error);
  }
};

/**
 * 캐시에서 데이터 조회
 * @param {string} reportType - 보고서 타입
 * @param {string} jobPostId - 공고 ID
 * @returns {any|null} 캐시된 데이터 또는 null
 */
export const getReportCache = (reportType, jobPostId) => {
  try {
    const cacheKey = getCacheKey(reportType, jobPostId);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      console.log(`❌ ${reportType} 보고서 캐시 없음:`, cacheKey);
      return null;
    }

    const cacheData = JSON.parse(cached);
    
    // 캐시 만료 확인
    if (Date.now() - cacheData.timestamp > CACHE_EXPIRY) {
      console.log(`⏰ ${reportType} 보고서 캐시 만료:`, cacheKey);
      localStorage.removeItem(cacheKey);
      return null;
    }

    // jobPostId 일치 확인
    if (cacheData.jobPostId !== jobPostId) {
      console.log(`🔄 ${reportType} 보고서 캐시 jobPostId 불일치:`, cacheKey);
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(`✅ ${reportType} 보고서 캐시 사용:`, cacheKey);
    return cacheData.data;
  } catch (error) {
    console.error('캐시 조회 실패:', error);
    return null;
  }
};

/**
 * 특정 보고서 캐시 삭제
 * @param {string} reportType - 보고서 타입
 * @param {string} jobPostId - 공고 ID
 */
export const clearReportCache = (reportType, jobPostId) => {
  try {
    const cacheKey = getCacheKey(reportType, jobPostId);
    localStorage.removeItem(cacheKey);
    console.log(`🗑️ ${reportType} 보고서 캐시 삭제:`, cacheKey);
  } catch (error) {
    console.error('캐시 삭제 실패:', error);
  }
};

/**
 * 특정 공고의 모든 보고서 캐시 삭제
 * @param {string} jobPostId - 공고 ID
 */
export const clearAllReportCache = (jobPostId) => {
  try {
    const reportTypes = ['document', 'written', 'interview', 'final'];
    reportTypes.forEach(type => {
      clearReportCache(type, jobPostId);
    });
    console.log(`🗑️ 공고 ${jobPostId}의 모든 보고서 캐시 삭제 완료`);
  } catch (error) {
    console.error('전체 캐시 삭제 실패:', error);
  }
};

/**
 * 모든 보고서 캐시 삭제
 */
export const clearAllCaches = () => {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    cacheKeys.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ 모든 보고서 캐시 삭제 완료: ${cacheKeys.length}개`);
  } catch (error) {
    console.error('전체 캐시 삭제 실패:', error);
  }
};

/**
 * 캐시 상태 확인
 * @param {string} jobPostId - 공고 ID
 * @returns {object} 각 보고서별 캐시 상태
 */
export const getCacheStatus = (jobPostId) => {
  const reportTypes = ['document', 'written', 'interview', 'final'];
  const status = {};

  reportTypes.forEach(type => {
    try {
      const cacheKey = getCacheKey(type, jobPostId);
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;
        const isExpired = age > CACHE_EXPIRY;
        const remainingTime = Math.max(0, CACHE_EXPIRY - age);
        
        status[type] = {
          exists: true,
          expired: isExpired,
          timestamp: cacheData.timestamp,
          age: age,
          remainingMinutes: Math.floor(remainingTime / (60 * 1000)),
          remainingSeconds: Math.floor((remainingTime % (60 * 1000)) / 1000)
        };
      } else {
        status[type] = { exists: false };
      }
    } catch (error) {
      status[type] = { exists: false, error: true };
    }
  });
  
  return status;
};

/**
 * 캐시 상태를 사용자 친화적으로 표시
 * @param {string} jobPostId - 공고 ID
 * @returns {string} 캐시 상태 요약
 */
export const getCacheStatusSummary = (jobPostId) => {
  const status = getCacheStatus(jobPostId);
  const summary = [];
  
  Object.entries(status).forEach(([type, data]) => {
    if (data.exists && !data.expired) {
      summary.push(`${type}: ${data.remainingMinutes}분 ${data.remainingSeconds}초 남음`);
    } else if (data.exists && data.expired) {
      summary.push(`${type}: 만료됨`);
    } else {
      summary.push(`${type}: 없음`);
    }
  });
  
  return summary.join(', ');
}; 