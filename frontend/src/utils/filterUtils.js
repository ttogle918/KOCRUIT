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
    if (text.includes('초반')) conditions.ageRange = [35, 39];
    else if (text.includes('중반')) conditions.ageRange = [40, 44];
    else if (text.includes('후반')) conditions.ageRange = [45, 49];
    else conditions.ageRange = [30, 39];
  } else if (text.includes('40대')) {
    conditions.ageRange = [40, 49];
  } else if (text.includes('50대')) {
    conditions.ageRange = [50, 59];
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
  if (text.includes('남성') || text.includes('남자')) {
    conditions.gender = '남성';
  } else if (text.includes('여성') || text.includes('여자')) {
    conditions.gender = '여성';
  }

  return conditions;
}; 