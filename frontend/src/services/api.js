import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL
  || import.meta.env.VITE_BACKEND_URL
  || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

export async function fetchConfig() {
  const { data } = await client.get('/config');
  return data;
}

export async function updateConfig(payload) {
  const { data } = await client.put('/config', payload);
  return data;
}

export async function fetchTemplates() {
  const { data } = await client.get('/templates');
  return data;
}

export async function updateTemplates(templates) {
  const { data } = await client.put('/templates', { templates });
  return data;
}

export async function createItem(formData) {
  const { data } = await client.post('/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function fetchItems() {
  const { data } = await client.get('/items');
  return data;
}

export async function fetchItem(id) {
  const { data } = await client.get(`/items/${id}`);
  return data;
}

export async function fetchLogs(id) {
  const { data } = await client.get(`/items/${id}/logs`);
  return data.logs;
}

export async function deleteItem(id) {
  await client.delete(`/items/${id}`);
}
