# 🎨 Kocruit Frontend

> **React + Vite 기반 채용 관리 시스템 프론트엔드**

## 📋 개요

Kocruit의 프론트엔드는 React 18과 Vite를 기반으로 구축된 현대적인 웹 애플리케이션입니다. 채용 담당자와 지원자 모두를 위한 직관적이고 반응형인 사용자 인터페이스를 제공합니다.

## 🛠️ 기술 스택

- **Framework**: React 18
- **Build Tool**: Vite 4.0+
- **Styling**: Tailwind CSS + Chakra UI
- **State Management**: React Context + useState/useReducer
- **HTTP Client**: Axios
- **Routing**: React Router DOM
- **Icons**: React Icons
- **PWA**: Workbox

## 🏗️ 프로젝트 구조

```
frontend/
├── public/              # 정적 파일
├── src/
│   ├── components/      # 재사용 가능한 컴포넌트
│   ├── pages/          # 페이지 컴포넌트
│   ├── hooks/          # 커스텀 훅
│   ├── services/       # API 서비스
│   ├── utils/          # 유틸리티 함수
│   ├── contexts/       # React Context
│   ├── styles/         # 스타일 파일
│   └── assets/         # 이미지, 아이콘 등
├── package.json
└── vite.config.js
```

## 🚀 주요 기능

### 👥 사용자 역할별 인터페이스

#### HR 담당자
- **대시보드**: 채용 현황 한눈에 보기
- **채용공고 관리**: 공고 작성, 수정, 게시
- **지원자 관리**: 지원서 검토, 상태 관리
- **면접 관리**: 면접 일정, 면접관 배정
- **통계 분석**: 채용 데이터 시각화

#### 지원자
- **공고 탐색**: 채용공고 검색 및 필터링
- **지원서 작성**: 이력서 업로드, 자기소개서 작성
- **면접 참여**: AI 면접, 실시간 면접 참여
- **진행 상황**: 지원 상태 실시간 확인

### 🎨 UI/UX 특징

#### 반응형 디자인
- **모바일 우선**: 모바일 기기 최적화
- **태블릿 지원**: 태블릿 화면에 맞는 레이아웃
- **데스크톱 확장**: 대화면에서의 효율적 활용

#### 접근성 (Accessibility)
- **키보드 네비게이션**: 모든 기능 키보드로 접근 가능
- **스크린 리더**: 시각 장애인을 위한 음성 안내
- **색상 대비**: WCAG 가이드라인 준수

#### 다국어 지원
- **한국어**: 기본 언어
- **영어**: 국제 지원자 대응
- **확장 가능**: i18n 구조로 추가 언어 지원

## 🔧 주요 컴포넌트

### 📊 대시보드 컴포넌트
```jsx
// Dashboard.jsx
- 채용 현황 카드
- 최근 지원자 목록
- 면접 일정 캘린더
- 통계 차트
```

### 📝 채용공고 관리
```jsx
// JobPostManagement.jsx
- 공고 목록 테이블
- 공고 작성/수정 폼
- 상태 관리 드롭다운
- 검색 및 필터링
```

### 👤 지원자 관리
```jsx
// ApplicantManagement.jsx
- 지원자 목록 그리드
- 이력서 미리보기 모달
- 상태 변경 버튼
- AI 분석 결과 표시
```

### 🎤 면접 시스템
```jsx
// InterviewSystem.jsx
- AI 면접 비디오 업로드
- 실시간 면접 인터페이스
- 면접 결과 표시
- 피드백 시스템
```

## 🚀 실행 방법

### 1. 환경 설정
```bash
# Node.js 18+ 설치 확인
node --version

# 의존성 설치
npm install
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
echo "VITE_WS_URL=ws://localhost:8000" >> .env
```

### 3. 개발 서버 실행
```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

### 4. 프로덕션 빌드
```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

### 5. Docker로 실행
```bash
# Docker 이미지 빌드
docker build -t kocruit-frontend .

# Docker 컨테이너 실행
docker run -p 5173:5173 kocruit-frontend
```

## 🎨 스타일링 가이드

### Tailwind CSS 사용법
```jsx
// 기본 클래스 사용
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-800">제목</h2>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    버튼
  </button>
</div>
```

### Chakra UI 컴포넌트
```jsx
// Chakra UI 컴포넌트 사용
import { Box, Button, Text, VStack } from '@chakra-ui/react';

<VStack spacing={4}>
  <Text fontSize="2xl" fontWeight="bold">제목</Text>
  <Button colorScheme="blue" size="lg">버튼</Button>
</VStack>
```

### 커스텀 스타일
```css
/* src/styles/custom.css */
.custom-card {
  @apply bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow;
}
```

## 🔌 API 연동

### Axios 설정
```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// 요청 인터셉터
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 커스텀 훅 사용
```javascript
// src/hooks/useApi.js
import { useState, useEffect } from 'react';

export const useApi = (url) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(url);
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
};
```

## 🧪 테스트

```bash
# 단위 테스트 실행
npm run test

# E2E 테스트 실행
npm run test:e2e

# 테스트 커버리지 확인
npm run test:coverage
```

## 📱 PWA 기능

### 오프라인 지원
- **Service Worker**: 오프라인에서도 기본 기능 사용 가능
- **캐싱 전략**: 자주 사용되는 데이터 캐싱
- **동기화**: 온라인 복구 시 데이터 동기화

### 모바일 앱 경험
- **설치 가능**: 홈 화면에 앱 아이콘 추가
- **푸시 알림**: 면접 일정, 상태 변경 알림
- **백그라운드 동기화**: 백그라운드에서 데이터 업데이트

## 🚀 성능 최적화

### 코드 분할
```javascript
// 라우트별 코드 분할
const JobPostManagement = lazy(() => import('./pages/JobPostManagement'));
const ApplicantManagement = lazy(() => import('./pages/ApplicantManagement'));
```

### 이미지 최적화
```jsx
// WebP 형식 사용, 지연 로딩
<img 
  src="/images/logo.webp" 
  alt="Logo" 
  loading="lazy"
  className="w-32 h-32"
/>
```

### 번들 최적화
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@chakra-ui/react', 'react-icons'],
        },
      },
    },
  },
});
```

## 🔒 보안

- **XSS 방지**: 입력 데이터 검증 및 이스케이프
- **CSRF 보호**: 토큰 기반 요청 검증
- **CSP 헤더**: 콘텐츠 보안 정책 적용
- **HTTPS 강제**: 프로덕션 환경에서 HTTPS 사용

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
