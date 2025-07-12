// 자연어 필터링 관련 공통 유틸리티 함수들

// 자연어 필터링 조건 파싱 함수
export const parseFilterConditions = (naturalLanguage) => {
  const conditions = {
    ageRange: null,
    education: null,
    skills: [],
    location: null,
    experience: null,
    gender: null
  };

  const text = naturalLanguage.toLowerCase();

  // 연령대 파싱
  if (text.includes('20대')) {
    if (text.includes('초반')) conditions.ageRange = [20, 24];
    else if (text.includes('중반')) conditions.ageRange = [25, 29];
    else if (text.includes('후반')) conditions.ageRange = [30, 34];
    else conditions.ageRange = [20, 29];
  } else if (text.includes('30대')) {
    if (text.includes('초반')) conditions.ageRange = [30, 34];
    else if (text.includes('중반')) conditions.ageRange = [35, 39];
    else if (text.includes('후반')) conditions.ageRange = [40, 44];
    else conditions.ageRange = [30, 39];
  } else if (text.includes('40대')) {
    conditions.ageRange = [40, 49];
  } else if (text.includes('50대')) {
    conditions.ageRange = [50, 59];
  }
  
  // 정확한 나이 파싱 (예: 21살, 25세)
  const exactAgeMatch = text.match(/(\d+)(?:세|살)/);
  if (exactAgeMatch && !text.includes('대')) {
    const age = parseInt(exactAgeMatch[1]);
    conditions.ageRange = [age, age];
  }
  
  // 구체적인 나이 범위 파싱 (예: 25-30세, 25세 이상 등)
  const ageRangeMatch = text.match(/(\d+)[-~](\d+)세?/);
  if (ageRangeMatch) {
    conditions.ageRange = [parseInt(ageRangeMatch[1]), parseInt(ageRangeMatch[2])];
  }
  
  const ageOverMatch = text.match(/(\d+)세?\s*이상/);
  if (ageOverMatch) {
    conditions.ageRange = [parseInt(ageOverMatch[1]), 100];
  }
  
  const ageUnderMatch = text.match(/(\d+)세?\s*이하/);
  if (ageUnderMatch) {
    conditions.ageRange = [0, parseInt(ageUnderMatch[1])];
  }

  // 학력 파싱
  if (text.includes('고졸') || text.includes('고등학교')) {
    conditions.education = '고등학교';
  } else if (text.includes('대졸') || text.includes('대학교') || text.includes('학사')) {
    conditions.education = '학사';
  } else if (text.includes('석사')) {
    conditions.education = '석사';
  } else if (text.includes('박사')) {
    conditions.education = '박사';
  }

  // 기술스택 파싱
  const skillKeywords = [
    'javascript', 'js', 'react', 'vue', 'angular', 'node', 'python', 'java', 'c++', 'c#',
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript', 'html', 'css', 'sql',
    'mongodb', 'mysql', 'postgresql', 'redis', 'docker', 'kubernetes', 'aws', 'azure',
    'git', 'linux', 'android', 'ios', 'flutter', 'react native'
  ];

  skillKeywords.forEach(skill => {
    if (text.includes(skill)) {
      conditions.skills.push(skill);
    }
  });

  // 지역 파싱
  const regions = [
    '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
  ];

  regions.forEach(region => {
    if (text.includes(region)) {
      conditions.location = region;
    }
  });

  // 경력 파싱
  if (text.includes('신입') || text.includes('경력 없음')) {
    conditions.experience = '신입';
  } else if (text.includes('경력') || text.includes('경험')) {
    conditions.experience = '경력';
  }

  // 성별 파싱
  if (text.includes('남성') || text.includes('남자') || text.includes('m') || text.includes('male')) {
    conditions.gender = 'M';
  } else if (text.includes('여성') || text.includes('여자') || text.includes('f') || text.includes('female')) {
    conditions.gender = 'F';
  }

  return conditions;
}; 