import { apiClient } from './apiClient';

export async function fetchJobs() {
    return apiClient.get('/api/jobs');
}

export async function fetchJobById(id) {
    return apiClient.get(`/api/jobs/${id}`);
}

export async function createJob(jobData) {
    return apiClient.post('/api/jobs', jobData);
}

export async function updateJob(id, jobData) {
    return apiClient.put(`/api/jobs/${id}`, jobData);
}

export async function deleteJob(id) {
    return apiClient.delete(`/api/jobs/${id}`);
}