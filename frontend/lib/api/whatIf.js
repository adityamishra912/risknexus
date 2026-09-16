import apiClient from './client';

export async function simulateControlToggles(payload) {
  return apiClient.post('/what-if/simulate-controls', payload);
}

export async function simulateWhatIfScenario(payload) {
  return apiClient.post('/what-if/scenario', payload);
}

export async function simulateWhatIfPortfolio(payload) {
  return apiClient.post('/what-if/portfolio', payload);
}
