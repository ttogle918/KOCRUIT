// 이력서 관련 공통 유틸리티 함수들

// 나이 계산 함수
export const calculateAge = (birthDate) => {
  if (!birthDate) return 'N/A';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// 전공/학위 추출 함수
export const extractMajorAndDegree = (degreeRaw) => {
  if (!degreeRaw) return { major: '-', degree: '학사' };
  const match = degreeRaw.match(/^(.*?)(?:\((.*?)\))?$/);
  if (match) {
    const major = match[1] ? match[1].trim() : '-';
    let degree = '학사';
    if (match[2]) {
      if (match[2].includes('박사')) degree = '박사';
      else if (match[2].includes('석사')) degree = '석사';
      else degree = match[2];
    }
    return { major, degree };
  }
  return { major: degreeRaw, degree: '학사' };
};

// 이력서 데이터 매핑 함수
export const mapResumeData = (data) => {
  console.log('mapResumeData input:', data);
  
  // education(문자열) → educations(배열)로 변환, degree에서 major 추출
  const educations = data.educations && Array.isArray(data.educations)
    ? data.educations.map(edu => {
        const { major, degree } = extractMajorAndDegree(edu.degree || '');
        return {
          schoolName: edu.schoolName || edu.school || '-',
          degree: degree,
          gpa: edu.gpa || '-',
          major: edu.major || major,
        };
      })
    : data.education
      ? (() => {
          const { major, degree } = extractMajorAndDegree(data.degree || '');
          return [{
            schoolName: data.education || '-',
            degree: degree,
            gpa: data.gpa || '-',
            major: data.major || major,
          }];
        })()
      : [{
          schoolName: '-',
          degree: '학사',
          gpa: '-',
          major: '-',
        }];

  // awards, certificates 등도 내부 구조 보정
  const awards = Array.isArray(data.awards) ? data.awards.map(award => ({
    date: award.date || award.awardDate || '',
    title: award.title || award.name || '',
    description: award.description || '',
    duration: award.duration || '',
  })) : [];

  const certificates = Array.isArray(data.certificates) ? data.certificates.map(cert => ({
    date: cert.date || cert.certificateDate || '',
    name: cert.name || cert.certificateName || '',
    duration: cert.duration || '',
  })) : [];

  const experiences = [];
  
  // activities 처리
  if (data.activities && Array.isArray(data.activities)) {
    experiences.push(...data.activities.map(activity => ({
      ...activity,
      type: 'activity'
    })));
  }
  
  // project_experience 처리
  if (data.project_experience && Array.isArray(data.project_experience)) {
    experiences.push(...data.project_experience.map(project => ({
      ...project,
      type: 'project'
    })));
  }

  return {
    applicantName: data.name || data.applicantName || '',
    gender: data.gender || '',
    birthDate: data.birthDate || data.birthdate || data.birthday || '',
    email: data.email || '',
    address: data.address || '',
    phone: data.phone || data.phoneNumber || '',
    educations: educations,
    awards: awards,
    certificates: certificates,
    skills: data.skills || [],
    experiences: experiences,
    content: data.content || data.selfIntroduction || '',
  };
}; 