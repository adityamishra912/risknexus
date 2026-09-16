import apiClient from './client';

export async function getRiskScenarios(params = {}) {
  return apiClient.get('/risk', params);
}

export async function getTopRiskDrivers(limit = 10) {
  return apiClient.get('/risk/top-drivers', { limit });
}

export async function triggerScenarioGeneration(payload = { scope: {} }) {
  return apiClient.post('/risk/scenarios/generate', payload);
}

export async function getGeneratedScenarios(params = {}) {
  return apiClient.get('/risk/scenarios/generated', params);
}

export async function getScenarioById(scenarioId) {
  return apiClient.get(`/risk/scenarios/${scenarioId}`);
}

export async function evaluateCustomScenario(payload) {
  return apiClient.post('/risk/evaluate', payload);
}

/** EAL aggregated by business service — derived from actual scenario data, not fixed fractions */
export async function getBusinessUnitRisk() {
  return apiClient.get('/risk/by-business-unit');
}

/**
 * Historical EAL snapshots for trend visualization.
 * Returns { snapshots: [], has_history: false } if no history recorded yet.
 */
export async function getRiskTrend(days = 30) {
  return apiClient.get('/risk/trend', { days });
}

/**
 * Empirical exceedance probability curve from enterprise Monte Carlo.
 * Returns { curve: [{loss, loss_formatted, exceedance_probability}...], mean_eal, p90, p95, p99 }
 */
export async function getLossDistribution(buckets = 30) {
  return apiClient.get('/risk/loss-distribution', { buckets });
}
