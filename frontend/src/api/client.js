const origin = window.location.origin.replace(/\/$/, '');
const fallback = origin.includes('5173') ? origin.replace(/:\d+$/, ':4001') : origin;
const API_BASE = import.meta.env.VITE_BACKEND_URL || fallback;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const api = {
  listJobs() {
    return request('/api/items');
  },
  getJob(id) {
    return request(`/api/items/${id}`);
  },
  getJobLogs(id) {
    return request(`/api/items/${id}/logs`);
  },
  deleteJob(id) {
    return request(`/api/items/${id}`, { method: 'DELETE' });
  },
  async createJob(formData) {
    const response = await fetch(`${API_BASE}/api/items`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    return response.json();
  },
  getConfig() {
    return request('/api/config');
  },
  updateConfig(config) {
    return request('/api/config', { method: 'PUT', body: JSON.stringify(config) });
  },
  listTemplates() {
    return request('/api/templates');
  },
  createTemplate(template) {
    return request('/api/templates', { method: 'POST', body: JSON.stringify(template) });
  },
  updateTemplate(id, template) {
    return request(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(template) });
  },
  deleteTemplate(id) {
    return request(`/api/templates/${id}`, { method: 'DELETE' });
  },
};
