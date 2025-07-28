// 필기 합격자 명단 페이지 테스트 스크립트

// 테스트할 URL들
const testUrls = [
  '/written-test-passed',
  '/written-test-passed/1',
  '/written-test-passed/2',
  '/written-test-passed/999',
  '/written-test-passed/invalid',
  '/written-test-passed/0'
];

// 페이지 로드 테스트
function testPageLoad(url) {
  console.log(`\n🔍 테스트 URL: ${url}`);
  
  // URL로 이동
  window.location.href = url;
  
  // 3초 후 결과 확인
  setTimeout(() => {
    const currentUrl = window.location.pathname;
    const hasError = document.querySelector('.text-red-500');
    const hasLoading = document.querySelector('.animate-spin');
    const hasContent = document.querySelector('.bg-white');
    
    console.log(`📍 현재 URL: ${currentUrl}`);
    console.log(`❌ 에러 표시: ${!!hasError}`);
    console.log(`⏳ 로딩 표시: ${!!hasLoading}`);
    console.log(`✅ 콘텐츠 표시: ${!!hasContent}`);
    
    if (hasError) {
      console.log(`📝 에러 메시지: ${hasError.textContent}`);
    }
    
    if (hasContent) {
      console.log(`📊 콘텐츠 확인: 필기 합격자 목록이 표시됨`);
    }
  }, 3000);
}

// API 테스트
async function testAPI(jobPostId) {
  console.log(`\n🔍 API 테스트: jobPostId = ${jobPostId}`);
  
  try {
    const response = await fetch(`/api/v1/ai-evaluate/written-test/passed/${jobPostId}`);
    const data = await response.json();
    
    console.log(`📡 API 응답 상태: ${response.status}`);
    console.log(`📦 응답 데이터:`, data);
    
    if (response.ok) {
      console.log(`✅ API 성공: ${data.length}명의 필기 합격자`);
    } else {
      console.log(`❌ API 실패: ${data.detail || '알 수 없는 오류'}`);
    }
  } catch (error) {
    console.log(`❌ API 호출 실패: ${error.message}`);
  }
}

// 사이드바 네비게이션 테스트
function testSidebarNavigation() {
  console.log(`\n🔍 사이드바 네비게이션 테스트`);
  
  // 사이드바 버튼 찾기
  const sidebarButtons = document.querySelectorAll('button');
  const writtenTestButton = Array.from(sidebarButtons).find(button => 
    button.textContent.includes('필기 합격자 명단')
  );
  
  if (writtenTestButton) {
    console.log(`✅ 필기 합격자 명단 버튼 발견`);
    console.log(`🔗 버튼 상태: ${writtenTestButton.disabled ? '비활성화' : '활성화'}`);
    
    // 버튼 클릭 테스트
    if (!writtenTestButton.disabled) {
      console.log(`🖱️ 버튼 클릭 시뮬레이션`);
      writtenTestButton.click();
    }
  } else {
    console.log(`❌ 필기 합격자 명단 버튼을 찾을 수 없음`);
  }
}

// 메인 테스트 함수
function runTests() {
  console.log(`🚀 필기 합격자 명단 페이지 테스트 시작`);
  
  // 1. API 테스트
  testAPI(1);
  testAPI(2);
  testAPI(999);
  
  // 2. 페이지 로드 테스트
  testUrls.forEach(url => {
    setTimeout(() => {
      testPageLoad(url);
    }, Math.random() * 1000);
  });
  
  // 3. 사이드바 테스트 (페이지 로드 후)
  setTimeout(() => {
    testSidebarNavigation();
  }, 5000);
}

// 테스트 실행
if (typeof window !== 'undefined') {
  // 브라우저 환경에서 실행
  window.testWrittenTestPage = runTests;
  console.log(`📝 테스트 함수가 준비되었습니다. 브라우저 콘솔에서 'testWrittenTestPage()'를 실행하세요.`);
} else {
  // Node.js 환경에서 실행
  console.log(`📝 이 스크립트는 브라우저에서 실행해야 합니다.`);
}

// 자동 테스트 실행 (옵션)
if (window.location.pathname.includes('written-test-passed')) {
  console.log(`🔍 필기 합격자 명단 페이지에서 자동 테스트 실행`);
  setTimeout(runTests, 2000);
} 