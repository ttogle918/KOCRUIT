import { apiClient } from './apiClient';

export async function fetchJobs() {
    return apiClient.get('/api/v1/public/jobposts');
}

export async function fetchJobById(id) {
    return apiClient.get(`/api/v1/public/jobposts/${id}`);
}

export async function createJob(jobData) {
    return apiClient.post('/api/v1/company/jobposts', jobData);
}

export async function updateJob(id, jobData) {
    return apiClient.put(`/api/v1/company/jobposts/${id}`, jobData);
}

export async function deleteJob(id) {
    return apiClient.delete(`/api/v1/company/jobposts/${id}`);
}