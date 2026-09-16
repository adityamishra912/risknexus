import apiClient from './client';

export async function getVulnerabilities(params = {}) {
  return apiClient.get('/vulnerabilities', params);
}

export async function getVulnerabilityDetail(cveId) {
  return apiClient.get(`/vulnerabilities/${cveId}`);
}
