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