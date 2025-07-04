import { apiClient } from './apiClient';

export async function fetchJobs() {
    return apiClient.get('/public/jobposts');
}

export async function fetchJobById(id) {
    return apiClient.get(`/public/jobposts/${id}`);
}

export async function createJob(jobData) {
    return apiClient.post('/company/jobposts', jobData);
}

export async function updateJob(id, jobData) {
    return apiClient.put(`/company/jobposts/${id}`, jobData);
}

export async function deleteJob(id) {
    return apiClient.delete(`/company/jobposts/${id}`);
}