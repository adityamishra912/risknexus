import apiClient from './client';

export async function getInitiatives(params = {}) {
  return apiClient.get('/optimization/initiatives', params);
}

export async function evaluatePortfolio(payload) {
  return apiClient.post('/optimization/evaluate', payload);
}

export async function recommendPortfolio(payload) {
  return apiClient.post('/optimization/recommend', payload);
}
