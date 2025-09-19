const envUrl = (import.meta.env.VITE_BACKEND_URL ?? import.meta.env.BACKEND_URL ?? '').trim();
const envPort = import.meta.env.VITE_BACKEND_PORT ?? import.meta.env.BACKEND_PORT ?? import.meta.env.PORT;

let baseUrl = envUrl;
if (!baseUrl && envPort) {
  baseUrl = `http://localhost:${envPort}`;
}
if (!baseUrl && import.meta.env.DEV) {
  baseUrl = 'http://localhost:4000';
}

const API_BASE = baseUrl ? baseUrl.replace(/\/$/, '') : '';

function withLeadingSlash(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

async function request(path, options = {}) {
  const target = `${API_BASE}${withLeadingSlash(path)}`;
  const response = await fetch(target, options);

  if (response.status === 204) {
    return null;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.error ?? 'Erreur inattendue du serveur.';
    throw new Error(message);
  }

  return payload;
}

export function getApiBaseUrl() {
  return API_BASE;
}

export async function fetchHealth() {
  return request('/health');
}

export async function fetchJobs() {
  return request('/api/items');
}

export async function fetchJob(id) {
  return request(`/api/items/${id}`);
}

export async function fetchLogs(id) {
  return request(`/api/items/${id}/logs`);
}

export async function createJob(formData) {
  const target = `${API_BASE}/api/items`;
  const response = await fetch(target, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error ?? 'Impossible de créer le traitement.');
  }

  return response.json();
}

export async function deleteJob(id) {
  await request(`/api/items/${id}`, { method: 'DELETE' });
}

export async function fetchTemplates() {
  return request('/api/templates');
}

export async function createTemplate(payload) {
  return request('/api/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function updateTemplate(id, payload) {
  return request(`/api/templates/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function deleteTemplate(id) {
  await request(`/api/templates/${id}`, { method: 'DELETE' });
}

export async function fetchConfig() {
  return request('/api/config');
}

export async function updateConfig(payload) {
  return request('/api/config', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
