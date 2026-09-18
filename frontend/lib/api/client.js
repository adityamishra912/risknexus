const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:8000/api/v1';

export async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error (${response.status}): ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`[API Client Warning] Request to ${url} failed:`, error.message);
    throw error;
  }
}

export const apiClient = {
  get: (endpoint, params = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
    ).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return fetchAPI(url, { method: 'GET' });
  },
  post: (endpoint, body = {}) => {
    return fetchAPI(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

export default apiClient;
