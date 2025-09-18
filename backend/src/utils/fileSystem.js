import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const JOBS_DIR = path.join(DATA_DIR, 'jobs');

export function ensureDataDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }
}

export function ensureJobDirectory(jobId) {
  const dir = path.join(JOBS_DIR, jobId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getJobsDir() {
  return JOBS_DIR;
}

export function writeTextFile(jobId, filename, content) {
  const dir = ensureJobDirectory(jobId);
  fs.writeFileSync(path.join(dir, filename), content);
}

export function writeJsonFile(jobId, filename, data) {
  writeTextFile(jobId, filename, JSON.stringify(data, null, 2));
}

export function removeJobDirectory(jobId) {
  const dir = path.join(JOBS_DIR, jobId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function getJobFilePath(jobId, filename) {
  return path.join(JOBS_DIR, jobId, filename);
}
