import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

function unwrap(response) {
  return response.data;
}

export function fetchItems() {
  return client.get('/items').then(unwrap);
}

export function fetchItem(id) {
  return client.get(`/items/${id}`).then(unwrap);
}

export function fetchLogs(id) {
  return client.get(`/items/${id}/logs`).then((response) => response.data?.logs || []);
}

export function createItem(formData) {
  return client
    .post('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then(unwrap);
}

export function deleteItem(id) {
  return client.delete(`/items/${id}`);
}

export function fetchConfig() {
  return client.get('/config').then(unwrap);
}

export function updateConfig(config) {
  return client.put('/config', config).then(unwrap);
}

export function fetchTemplates() {
  return client.get('/templates').then(unwrap);
}

export function updateTemplates(templates) {
  return client.put('/templates', { templates }).then(unwrap);
}
