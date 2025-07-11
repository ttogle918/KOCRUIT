// 지원자 통계 집계 유틸리티 함수들

// 나이 계산 함수
export function calculateAge(birthDate) {
  if (!birthDate) return 'N/A';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// 지원자 학력 통계 집계 함수
export function getEducationStats(applicants) {
  let high = 0, bachelor = 0, master = 0, doctor = 0;
  applicants.forEach((a) => {
    let level = null;
    // 1. degree 필드 우선 분류
    if (!level && a.degree) {
      const degreeStr = a.degree.toLowerCase();
      if (degreeStr.includes('박사')) level = '박사';
      else if (degreeStr.includes('석사')) level = '석사';
      else if (degreeStr.includes('학사')) level = '학사';
      else if (degreeStr.includes('고등')) level = '고등학교졸업';
    }
    // 2. educations 배열
    if (!level && a.educations && a.educations.length > 0) {
      for (let i = 0; i < a.educations.length; i++) {
        const edu = a.educations[i];
        const schoolName = (edu.schoolName || '').toLowerCase();
        const degree = (edu.degree || '').toLowerCase();
        if (schoolName.includes('대학원')) {
          if (degree.includes('박사')) { level = '박사'; break; }
          if (degree.includes('석사')) { level = '석사'; break; }
          level = '석사'; break;
        } else if (schoolName.includes('대학교') || schoolName.includes('대학')) {
          level = '학사';
        } else if (schoolName.includes('고등학교') || schoolName.includes('고등') || schoolName.includes('고졸') || schoolName.includes('high')) {
          level = '고등학교졸업';
        }
      }
      if (!level) level = '학사';
    }
    // 3. education 단일 필드
    if (!level && a.education) {
      const education = a.education.toLowerCase();
      if (education.includes('박사') || education.includes('phd') || education.includes('doctor')) {
        level = '박사';
      } else if (education.includes('석사') || education.includes('master')) {
        level = '석사';
      } else if (education.includes('학사') || education.includes('bachelor') || education.includes('대학교') || education.includes('대학') || education.includes('university') || education.includes('전문학사') || education.includes('associate') || education.includes('전문대') || education.includes('2년제') || education.includes('대학교졸업') || education.includes('졸업')) {
        level = '학사';
      } else if (education.includes('고등학교') || education.includes('고등') || education.includes('고졸') || education.includes('high')) {
        level = '고등학교졸업';
      }
    }
    // 한 번만 카운트
    if (level === '박사') doctor++;
    else if (level === '석사') master++;
    else if (level === '학사') bachelor++;
    else if (level === '고등학교졸업') high++;
  });
  return [
    { name: '고등학교졸업', value: high },
    { name: '학사', value: bachelor },
    { name: '석사', value: master },
    { name: '박사', value: doctor }
  ];
}

// 성별 통계 집계 함수
export function getGenderStats(applicants) {
  const male = applicants.filter(a => a.gender === 'M').length;
  const female = applicants.filter(a => a.gender === 'F').length;
  return [
    { name: '남성', value: male },
    { name: '여성', value: female }
  ];
}

// 나이대별 통계 집계 함수
export function getAgeGroupStats(applicants) {
  const now = new Date();
  const getAge = (birth) => {
    if (!birth) return null;
    const birthDate = new Date(birth);
    if (isNaN(birthDate.getTime())) return null;
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
    return age;
  };
  const AGE_GROUPS = [
    { label: '20대초반', min: 20, max: 23 },
    { label: '20대중반', min: 24, max: 26 },
    { label: '20대후반', min: 27, max: 29 },
    { label: '30대초반', min: 30, max: 33 },
    { label: '30대중반', min: 34, max: 36 },
    { label: '30대후반', min: 37, max: 39 },
    { label: '40대', min: 40, max: 49 },
    { label: '50대이상', min: 50, max: 150 },
  ];
  const stats = AGE_GROUPS.map(g => ({ name: g.label, count: 0 }));
  applicants.forEach(app => {
    const birth = app.birthDate || app.birthdate || app.birthday;
    const age = getAge(birth);
    if (age === null) return;
    for (let i = 0; i < AGE_GROUPS.length; i++) {
      const g = AGE_GROUPS[i];
      if (age >= g.min && age <= g.max) {
        stats[i].count++;
        break;
      }
    }
  });
  return stats;
}

// 지원자별 자격증 수 분포(히스토그램)
export function getCertificateCountStats(applicants) {
  // 0개, 1개, 2개, 3개 이상 구간별 집계
  let zero = 0, one = 0, two = 0, threePlus = 0;
  applicants.forEach(a => {
    const count = Array.isArray(a.certificates) ? a.certificates.length : 0;
    if (count === 0) zero++;
    else if (count === 1) one++;
    else if (count === 2) two++;
    else threePlus++;
  });
  return [
    { name: '0개', count: zero },
    { name: '1개', count: one },
    { name: '2개', count: two },
    { name: '3개 이상', count: threePlus }
  ];
}

// 지원 상태별 통계 집계 함수
export function getApplicationStatusStats(applicants) {
  const waiting = applicants.filter(a => a.status === 'WAITING').length;
  const passed = applicants.filter(a => a.status === 'PASSED').length;
  const rejected = applicants.filter(a => a.status === 'REJECTED').length;
  const processing = applicants.filter(a => a.status === 'PROCESSING').length;
  
  return [
    { name: '대기중', value: waiting },
    { name: '합격', value: passed },
    { name: '불합격', value: rejected },
    { name: '처리중', value: processing }
  ];
}

// 신규 지원자 통계 (오늘 날짜 기준)
export function getNewApplicantsToday(applicants) {
  const today = new Date().toDateString();
  return applicants.filter(a => {
    const appliedDate = new Date(a.appliedAt || a.applied_at).toDateString();
    return appliedDate === today;
  }).length;
}

// 미열람 지원자 통계
export function getUnviewedApplicants(applicants) {
  return applicants.filter(a => !a.isViewed).length;
}

// 지원 시기별 지원자 수 추이(일 단위)
export function getApplicationTrendStats(applicants) {
  const dateMap = {};
  applicants.forEach(app => {
    const dateStr = (app.appliedAt || app.applied_at || '').slice(0, 10); // YYYY-MM-DD
    if (!dateStr) return;
    if (!dateMap[dateStr]) dateMap[dateStr] = 0;
    dateMap[dateStr]++;
  });
  // 날짜 오름차순 정렬
  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

// 차트 색상 상수
export const CHART_COLORS = {
  GENDER: ['#42a5f5', '#f06292'],
  EDUCATION: ['#ffd54f', '#4fc3f7', '#ab47bc', '#66bb6a'],
  AGE_GROUP: '#42a5f5',
  STATUS: ['#ff9800', '#4caf50', '#f44336', '#9c27b0'],
  CERTIFICATE: '#ff9800'
}; 

// 도명 리스트 (GeoJSON의 properties.name과 일치해야 함)
const PROVINCES = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시",
  "세종특별자치시", "경기도", "강원도", "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도", "제주특별자치도"
];

// 주소에서 도/광역시명 robust 추출 (영문, 약칭, 공백, 괄호, 오타 등 보정)
export function extractProvince(address = "") {
  if (!address || typeof address !== "string") return "기타";
  const raw = address.replace(/\s|\(.*?\)/g, "").toLowerCase();
  // 한글 도/광역시명, 약칭, 영문, 오타 등 매핑 테이블
  const PROVINCE_MAP = [
    { keys: ["서울", "seoul"], name: "서울특별시" },
    { keys: ["부산", "busan"], name: "부산광역시" },
    { keys: ["대구", "daegu"], name: "대구광역시" },
    { keys: ["인천", "incheon"], name: "인천광역시" },
    { keys: ["광주", "gwangju"], name: "광주광역시" },
    { keys: ["대전", "daejeon"], name: "대전광역시" },
    { keys: ["울산", "ulsan"], name: "울산광역시" },
    { keys: ["세종", "sejong"], name: "세종특별자치시" },
    { keys: ["경기", "gyeonggi"], name: "경기도" },
    { keys: ["강원", "gangwon"], name: "강원도" },
    { keys: ["충북", "충청북", "chungbuk", "chungcheongbuk"], name: "충청북도" },
    { keys: ["충남", "충청남", "chungnam", "chungcheongnam"], name: "충청남도" },
    { keys: ["전북", "전라북", "jeonbuk", "jeollabuk"], name: "전라북도" },
    { keys: ["전남", "전라남", "jeonnam", "jeollanam"], name: "전라남도" },
    { keys: ["경북", "경상북", "gyeongbuk", "gyeongsangbuk"], name: "경상북도" },
    { keys: ["경남", "경상남", "gyeongnam", "gyeongsangnam"], name: "경상남도" },
    { keys: ["제주", "jeju"], name: "제주특별자치도" },
  ];
  for (const prov of PROVINCE_MAP) {
    if (prov.keys.some(k => raw.includes(k))) return prov.name;
  }
  return "기타";
}

// 지원자 리스트에서 도별 인원수 집계
export function getProvinceStats(applicants) {
  const counts = {};
  PROVINCES.forEach(prov => { counts[prov] = 0; });
  let etcCount = 0;
  applicants.forEach(app => {
    const prov = extractProvince(app.address || "");
    if (counts[prov] !== undefined) counts[prov]++;
    else etcCount++;
  });
  // [{name, value}] 형태로 반환, '기타' 포함
  const stats = Object.entries(counts).map(([name, value]) => ({ name, value }));
  stats.push({ name: "기타", value: etcCount });
  return stats;
} 