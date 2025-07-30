// 필기 합격자 명단 페이지 디버깅 스크립트

// 현재 페이지 상태 확인
function checkCurrentPage() {
  console.log('🔍 현재 페이지 상태 확인');
  console.log('📍 현재 URL:', window.location.href);
  console.log('📍 경로:', window.location.pathname);
  console.log('📍 검색 파라미터:', window.location.search);
  console.log('📍 해시:', window.location.hash);
  
  // URL 파라미터 추출
  const pathParts = window.location.pathname.split('/');
  console.log('📍 경로 파트:', pathParts);
  
  const possibleJobPostId = pathParts[pathParts.length - 1];
  console.log('📍 추출된 jobpostId:', possibleJobPostId);
  
  // React Router 파라미터 확인
  if (window.location.pathname.includes('written-test-passed')) {
    console.log('✅ 필기 합격자 명단 페이지에 있음');
    
    // 페이지 컴포넌트 상태 확인
    const errorElement = document.querySelector('.text-red-500');
    const loadingElement = document.querySelector('.animate-spin');
    const contentElement = document.querySelector('.bg-white');
    
    console.log('📊 페이지 상태:');
    console.log('  - 에러 표시:', !!errorElement);
    console.log('  - 로딩 표시:', !!loadingElement);
    console.log('  - 콘텐츠 표시:', !!contentElement);
    
    if (errorElement) {
      console.log('❌ 에러 메시지:', errorElement.textContent);
    }
    
    if (contentElement) {
      console.log('✅ 콘텐츠가 표시됨');
    }
  } else {
    console.log('❌ 필기 합격자 명단 페이지가 아님');
  }
}

// API 테스트
async function testAPI(jobPostId) {
  console.log(`\n🔍 API 테스트: jobPostId = ${jobPostId}`);
  
  try {
    const response = await fetch(`/api/v1/ai-evaluate/written-test/passed/${jobPostId}`);
    console.log(`📡 API 응답 상태: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API 성공: ${data.length}명의 필기 합격자`);
      console.log('📦 응답 데이터:', data);
    } else {
      const errorData = await response.json();
      console.log(`❌ API 실패: ${errorData.detail || '알 수 없는 오류'}`);
    }
  } catch (error) {
    console.log(`❌ API 호출 실패: ${error.message}`);
  }
}

// 라우팅 테스트
function testRouting() {
  console.log('\n🔍 라우팅 테스트');
  
  const testUrls = [
    '/written-test-passed',
    '/written-test-passed/1',
    '/written-test-passed/2',
    '/written-test-passed/999'
  ];
  
  testUrls.forEach(url => {
    console.log(`📍 테스트 URL: ${url}`);
    // 실제로는 window.location.href = url; 을 사용하지만
    // 여기서는 로그만 출력
  });
}

// React Router 파라미터 확인
function checkReactRouterParams() {
  console.log('\n🔍 React Router 파라미터 확인');
  
  // useParams 훅이 제대로 작동하는지 확인
  const pathParts = window.location.pathname.split('/');
  const jobpostId = pathParts[pathParts.length - 1];
  
  console.log('📍 URL에서 추출한 jobpostId:', jobpostId);
  console.log('📍 jobpostId 타입:', typeof jobpostId);
  console.log('📍 jobpostId가 숫자인가:', !isNaN(parseInt(jobpostId)));
  console.log('📍 jobpostId가 0보다 큰가:', parseInt(jobpostId) > 0);
  
  // 유효성 검사
  const isValid = jobpostId && 
                 jobpostId !== 'undefined' && 
                 jobpostId !== 'null' && 
                 !isNaN(parseInt(jobpostId)) && 
                 parseInt(jobpostId) > 0;
  
  console.log('📍 유효성 검사 결과:', isValid);
  
  return { jobpostId, isValid };
}

// 전체 디버깅 실행
function runFullDebug() {
  console.log('🚀 필기 합격자 명단 페이지 전체 디버깅 시작');
  
  // 1. 현재 페이지 상태 확인
  checkCurrentPage();
  
  // 2. React Router 파라미터 확인
  const { jobpostId, isValid } = checkReactRouterParams();
  
  // 3. API 테스트 (유효한 jobpostId가 있을 때만)
  if (isValid) {
    testAPI(jobpostId);
  } else {
    console.log('⚠️ 유효하지 않은 jobpostId로 인해 API 테스트 건너뜀');
  }
  
  // 4. 라우팅 테스트
  testRouting();
  
  console.log('\n✅ 디버깅 완료');
}

// 브라우저 콘솔에서 사용할 함수들
window.debugWrittenTest = {
  checkCurrentPage,
  testAPI,
  testRouting,
  checkReactRouterParams,
  runFullDebug
};

// 자동 실행 (필기 합격자 명단 페이지에서만)
if (window.location.pathname.includes('written-test-passed')) {
  console.log('🔍 필기 합격자 명단 페이지에서 자동 디버깅 실행');
  setTimeout(runFullDebug, 1000);
}

console.log('📝 디버깅 함수들이 준비되었습니다:');
console.log('  - debugWrittenTest.checkCurrentPage()');
console.log('  - debugWrittenTest.testAPI(jobPostId)');
console.log('  - debugWrittenTest.runFullDebug()'); 