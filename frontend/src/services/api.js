const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('gatepass_token');
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return Promise.reject(
      new Error('Could not connect to GatePass. Check that the API is running.'),
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || data.message || 'Request failed. Please try again.');
  return data;
}
