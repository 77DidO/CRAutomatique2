import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import { listJobs, getJob, saveJob, deleteJob, upsertJobUpdate } from './jobStore.js';
import { ensureJobDirectory, removeJobDirectory, getJobFilePath } from '../utils/fileSystem.js';
import { processJob } from './pipeline.js';

const uploadDir = path.join(process.cwd(), 'backend', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  }
});

export const uploadMiddleware = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('audio') && !file.mimetype.startsWith('video')) {
      cb(new Error('Seuls les fichiers audio ou vidéo sont acceptés.'));
    } else {
      cb(null, true);
    }
  }
});

let isWatcherStarted = false;
let runningJob = null;

function getNextQueuedJob() {
  return listJobs().find((job) => job.status === 'queued');
}

async function runJob(job) {
  runningJob = job.id;
  await processJob(job, (progressJob) => {
    runningJob = progressJob.status === 'done' || progressJob.status === 'error' ? null : job.id;
  });
  runningJob = null;
}

function startLoop() {
  if (isWatcherStarted) {
    return;
  }
  isWatcherStarted = true;
  setInterval(() => {
    if (runningJob) {
      return;
    }
    const nextJob = getNextQueuedJob();
    if (nextJob) {
      runJob(nextJob).catch((error) => {
        console.error('Erreur du watcher', error);
        upsertJobUpdate(nextJob.id, () => ({ status: 'error', error: error.message }));
      });
    }
  }, 500);
}

export function initJobWatcher() {
  startLoop();
}

export function createJobFromUpload({ file, body }) {
  const id = uuid();
  const participants = (body.participants || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const now = new Date().toISOString();
  const job = {
    id,
    title: body.title || file.originalname,
    template: body.template,
    participants,
    status: 'queued',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    logs: [],
    uploadPath: file.path,
    originalFilename: file.originalname,
    resources: []
  };
  ensureJobDirectory(id);
  saveJob(job);
  return job;
}

export function getLogs(jobId) {
  const filePath = getJobFilePath(jobId, 'logs.txt');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8').split('\n');
  }
  return [];
}

export function removeJob(id) {
  const job = getJob(id);
  if (!job) {
    return;
  }
  if (job.uploadPath && fs.existsSync(job.uploadPath)) {
    fs.unlinkSync(job.uploadPath);
  }
  removeJobDirectory(id);
  deleteJob(id);
}
