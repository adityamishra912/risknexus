import apiClient from './client';

export async function getAttackPathsAnalysis(params = {}) {
  return apiClient.get('/attack-paths', params);
}

export async function getAttackGraphTopology(params = {}) {
  return apiClient.get('/attack-paths/graph', params);
}
