import axios from './axiosInstance';

// AI 필기 문제 생성 요청
export const generateWrittenTest = async ({ jobPostId, jobTitle, department }) => {
  // 실제 API 엔드포인트는 추후 백엔드 구현에 맞게 수정
  const res = await axios.post('/api/v1/written-test/generate', {
    jobPostId, jobTitle, department
  });
  return res.data;
};

// 필기 문제 제출 요청
export const submitWrittenTest = async ({ jobPostId, questions }) => {
  // 실제 API 엔드포인트는 추후 백엔드 구현에 맞게 수정
  const res = await axios.post('/api/v1/written-test/submit', {
    jobPostId, questions
  });
  return res.data;
};

// 필기 답변/피드백 조회
export const getWrittenTestAnswers = async ({ jobPostId, userId }) => {
  const res = await axios.get(`/api/v1/applications/job/${jobPostId}/user/${userId}/written-answers`);
  return res.data;
};

// 필기 상태+점수 동시 업데이트
export const updateWrittenTestStatusAndScore = async ({ userId, jobPostId, status, score }) => {
  const res = await axios.post('/api/v1/ai-evaluate/written-test/update-status-and-score', {
    user_id: userId,
    jobpost_id: jobPostId,
    status,
    score
  });
  return res.data;
}; 