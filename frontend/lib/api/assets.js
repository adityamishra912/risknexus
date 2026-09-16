import apiClient from './client';

export async function getAssetsList(params = {}) {
  return apiClient.get('/assets', params);
}

export async function getTopRiskAssets(limit = 10) {
  return apiClient.get('/assets/top-risk', { limit });
}

export async function getAssetDetail(assetId) {
  return apiClient.get(`/assets/${assetId}`);
}
