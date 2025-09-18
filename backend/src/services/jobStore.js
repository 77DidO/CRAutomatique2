import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JOB_DB_PATH = path.join(__dirname, '../../data/jobs/index.json');

function readStore() {
  if (!fs.existsSync(JOB_DB_PATH)) {
    fs.writeFileSync(JOB_DB_PATH, JSON.stringify({ items: [] }, null, 2));
  }
  const raw = fs.readFileSync(JOB_DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeStore(data) {
  fs.writeFileSync(JOB_DB_PATH, JSON.stringify(data, null, 2));
}

export function listJobs() {
  return readStore().items;
}

export function getJob(id) {
  const store = readStore();
  return store.items.find((item) => item.id === id) || null;
}

export function saveJob(job) {
  const store = readStore();
  const index = store.items.findIndex((item) => item.id === job.id);
  if (index >= 0) {
    store.items[index] = job;
  } else {
    store.items.push(job);
  }
  writeStore(store);
  return job;
}

export function deleteJob(id) {
  const store = readStore();
  const nextItems = store.items.filter((item) => item.id !== id);
  writeStore({ items: nextItems });
}

export function upsertJobUpdate(id, updater) {
  const store = readStore();
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Job ${id} not found`);
  }
  const current = store.items[index];
  const next = { ...current, ...updater(current) };
  store.items[index] = next;
  writeStore(store);
  return next;
}
