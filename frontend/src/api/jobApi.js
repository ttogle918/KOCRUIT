import axios from './axiosInstance';

// 공개 채용공고 리스트 조회
export const getPublicJobPosts = async () => {
  const res = await axios.get('/api/v1/public/jobposts/');
  return res.data;
};

export async function fetchJobById(id) {
    return axios.get(`/api/v1/public/jobposts/${id}`);
}

export async function createJob(jobData) {
    return axios.post('/api/v1/company/jobposts', jobData);
}

export async function updateJob(id, jobData) {
    return axios.put(`/api/v1/company/jobposts/${id}`, jobData);
}

export async function deleteJob(id) {
    return axios.delete(`/api/v1/company/jobposts/${id}`);
}