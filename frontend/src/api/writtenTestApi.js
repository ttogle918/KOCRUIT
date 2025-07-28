import axios from './axiosInstance';

// AI 필기 문제 생성 요청
export const generateWrittenTest = async ({ jobPostId, jobTitle, department }) => {
  const res = await axios.post('/written-test/generate', {
    job_post_id: jobPostId // snake_case로 변경, 필요한 필드만 전송
  });
  return res.data;
};

// 필기 문제 제출 요청
export const submitWrittenTest = async ({ jobPostId, questions }) => {
  const res = await axios.post('/written-test/submit', {
    jobPostId, // camelCase로 유지
    questions
  });
  return res.data;
};

// 필기 답변/피드백 조회
export const getWrittenTestAnswers = async ({ jobPostId, userId }) => {
  const res = await axios.get(`/applications/job/${jobPostId}/user/${userId}/written-answers`);
  return res.data;
};

// 필기 상태+점수 동시 업데이트
export const updateWrittenTestStatusAndScore = async ({ userId, jobPostId, status, score }) => {
  const res = await axios.post('/ai-evaluate/written-test/update-status-and-score', {
    user_id: userId,
    jobpost_id: jobPostId,
    status,
    score
  });
  return res.data;
}; 