// 성능 최적화 유틸리티 함수들

// 디바운스 함수
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 쓰로틀 함수
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 메모이제이션 함수
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
};

// 성능 측정 함수
export const measurePerformance = (name, fn) => {
  return (...args) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    console.log(`${name} 실행 시간: ${end - start}ms`);
    return result;
  };
};

// 이미지 지연 로딩
export const lazyLoadImage = (src, placeholder = '/placeholder.png') => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(placeholder);
    img.src = src;
  });
};

// 데이터 청크 분할
export const chunkArray = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

// 가상 스크롤 계산
export const calculateVirtualScroll = (scrollTop, itemHeight, containerHeight, totalItems) => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const endIndex = Math.min(startIndex + visibleCount, totalItems);
  
  return {
    startIndex,
    endIndex,
    visibleCount,
    offsetY: startIndex * itemHeight
  };
};

// 메모리 사용량 체크
export const checkMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = performance.memory;
    const used = Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100;
    const total = Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100;
    const limit = Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100;
    
    console.log(`메모리 사용량: ${used}MB / ${total}MB (제한: ${limit}MB)`);
    
    return {
      used,
      total,
      limit,
      percentage: Math.round((used / limit) * 100)
    };
  }
  return null;
};

// 캐시 관리
export class CacheManager {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value, ttl = 300000) { // 기본 5분 TTL
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// API 요청 최적화
export class ApiOptimizer {
  constructor() {
    this.pendingRequests = new Map();
    this.cache = new CacheManager();
  }

  async request(key, apiCall, useCache = true) {
    // 캐시 확인
    if (useCache) {
      const cached = this.cache.get(key);
      if (cached) return cached;
    }

    // 중복 요청 방지
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // 새 요청 생성
    const promise = apiCall().then(result => {
      if (useCache) {
        this.cache.set(key, result);
      }
      this.pendingRequests.delete(key);
      return result;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  cancelRequest(key) {
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.delete(key);
    }
  }
}

// 렌더링 최적화
export const optimizeRendering = {
  // 불필요한 리렌더링 방지
  shouldComponentUpdate: (prevProps, nextProps, keys = []) => {
    if (keys.length === 0) {
      return JSON.stringify(prevProps) !== JSON.stringify(nextProps);
    }
    
    return keys.some(key => prevProps[key] !== nextProps[key]);
  },

  // 스크롤 최적화
  optimizeScroll: (callback, delay = 16) => {
    let ticking = false;
    return (event) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          callback(event);
          ticking = false;
        });
        ticking = true;
      }
    };
  },

  // 리사이즈 최적화
  optimizeResize: (callback, delay = 250) => {
    return debounce(callback, delay);
  }
};

// 웹 워커 유틸리티
export const createWorker = (workerFunction) => {
  const blob = new Blob([`(${workerFunction.toString()})()`], {
    type: 'application/javascript'
  });
  return new Worker(URL.createObjectURL(blob));
};

// 데이터 처리 워커 예시
export const dataProcessingWorker = () => {
  self.onmessage = function(e) {
    const { data, type } = e.data;
    
    switch (type) {
      case 'SORT':
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        self.postMessage({ type: 'SORT_RESULT', data: sorted });
        break;
        
      case 'FILTER':
        const filtered = data.filter(item => item.active);
        self.postMessage({ type: 'FILTER_RESULT', data: filtered });
        break;
        
      case 'CALCULATE':
        const sum = data.reduce((acc, item) => acc + item.value, 0);
        self.postMessage({ type: 'CALCULATE_RESULT', data: sum });
        break;
    }
  };
};

// 성능 모니터링
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
  }

  startTimer(name) {
    this.metrics.set(name, performance.now());
  }

  endTimer(name) {
    const startTime = this.metrics.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.delete(name);
      
      // 성능 임계값 체크
      if (duration > 100) {
        console.warn(`성능 경고: ${name}이 ${duration.toFixed(2)}ms 소요됨`);
      }
      
      return duration;
    }
    return 0;
  }

  measureMemory() {
    return checkMemoryUsage();
  }

  addObserver(callback) {
    this.observers.push(callback);
  }

  notifyObservers(metric) {
    this.observers.forEach(callback => callback(metric));
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// 개발 환경에서만 성능 로깅
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.addObserver((metric) => {
    console.log('성능 메트릭:', metric);
  });
} 