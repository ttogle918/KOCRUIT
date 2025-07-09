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
  // 0개, 1~2개, 3개 이상 구간별 집계
  let zero = 0, oneTwo = 0, threePlus = 0;
  applicants.forEach(a => {
    const count = Array.isArray(a.certificates) ? a.certificates.length : 0;
    if (count === 0) zero++;
    else if (count <= 2) oneTwo++;
    else threePlus++;
  });
  return [
    { label: '0개', numApplicants: zero },
    { label: '1~2개', numApplicants: oneTwo },
    { label: '3개 이상', numApplicants: threePlus }
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

// 지원자 경력 수준 통계
export function getExperienceLevelStats(applicants) {
  let entry = 0, junior = 0, senior = 0, expert = 0;
  
  applicants.forEach(a => {
    const experiences = a.experiences || [];
    const totalYears = experiences.reduce((total, exp) => {
      if (exp.duration) {
        const duration = exp.duration.toLowerCase();
        if (duration.includes('년')) {
          const years = parseInt(duration.match(/(\d+)/)?.[1] || '0');
          return total + years;
        }
      }
      return total;
    }, 0);
    
    if (totalYears === 0) entry++;
    else if (totalYears <= 3) junior++;
    else if (totalYears <= 7) senior++;
    else expert++;
  });
  
  return [
    { name: '신입', value: entry },
    { name: '주니어(1-3년)', value: junior },
    { name: '시니어(4-7년)', value: senior },
    { name: '엑스퍼트(8년+)', value: expert }
  ];
}

// 차트 색상 상수
export const CHART_COLORS = {
  GENDER: ['#42a5f5', '#f06292'],
  EDUCATION: ['#ffd54f', '#4fc3f7', '#ab47bc', '#66bb6a'],
  AGE_GROUP: '#42a5f5',
  STATUS: ['#ff9800', '#4caf50', '#f44336', '#9c27b0'],
  EXPERIENCE: ['#ff5722', '#2196f3', '#ff9800', '#4caf50']
}; 