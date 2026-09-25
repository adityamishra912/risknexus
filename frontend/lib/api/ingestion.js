import apiClient from './client';

export async function getDatasets() {
  return apiClient.get('/ingestion');
}

export async function uploadDataset(formData) {
  return apiClient.postForm('/data-sources/upload', formData);
}

export function getDataSourceStatus() {
  return apiClient.get('/data-sources/status');
}

export function runDataSources() {
  return apiClient.post('/data-sources/run');
}
