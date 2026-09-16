import apiClient from './client';

export async function getDatasets() {
  return apiClient.get('/ingestion');
}

export async function uploadDataset(formData) {
  return apiClient.post('/ingestion/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
