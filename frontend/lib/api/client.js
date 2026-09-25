const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:8000/api/v1';

export async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const config = { ...options, headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...options.headers } };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const responseText = await response.text();
      let detail = responseText;
      try {
        const parsed = JSON.parse(responseText);
        detail = parsed.detail || parsed.error || responseText;
      } catch {
        // Preserve non-JSON server responses in the diagnostic message.
      }
      throw new Error(`API ${response.status} ${response.statusText} at ${url}: ${detail || 'empty response'}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[API Client Error] Request to ${url} failed:`, error);
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
  postForm: (endpoint, formData) => fetchAPI(endpoint, {
    method: 'POST',
    body: formData,
    headers: {},
  }),
};

export default apiClient;
