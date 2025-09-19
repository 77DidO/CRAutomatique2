import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const JOBS_DIR = path.join(DATA_DIR, 'jobs');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
export const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
export const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

export function jobDirectory(jobId) {
  return path.join(JOBS_DIR, jobId);
}

export function jobAssetPath(jobId, filename) {
  return path.join(jobDirectory(jobId), filename);
}
