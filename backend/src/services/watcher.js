import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import { listJobs, getJob, saveJob, deleteJob, upsertJobUpdate } from './jobStore.js';
import { ensureJobDirectory, removeJobDirectory, getJobFilePath } from '../utils/fileSystem.js';
import { processJob } from './pipeline.js';
import { info, warn, error as logError, debug } from '../utils/logger.js';
import { getConfig } from './configService.js';
import { DEFAULT_TEMPLATE_ID } from '../constants/templates.js';

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
  info('Lancement du traitement du job', { jobId: job.id, title: job.title });
  await processJob(job, (progressJob) => {
    runningJob = progressJob.status === 'done' || progressJob.status === 'error' ? null : job.id;
    debug('Mise à jour du job', { jobId: progressJob.id, status: progressJob.status, progress: progressJob.progress });
  });
  info('Traitement du job terminé', { jobId: job.id });
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
      debug('Job en attente détecté', { jobId: nextJob.id });
      runJob(nextJob).catch((error) => {
        logError('Erreur du watcher', { message: error.message, stack: error.stack });
        upsertJobUpdate(nextJob.id, () => ({ status: 'error', error: error.message }));
      });
    }
  }, 500);
}

export function initJobWatcher() {
  info('Démarrage du watcher de jobs.');
  startLoop();
}

export function createJobFromUpload({ file, body }) {
  const id = uuid();
  const participants = (body.participants || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const config = getConfig();
  const templateInput = typeof body.template === 'string' ? body.template.trim() : '';
  const template = templateInput || config?.defaultTemplate || DEFAULT_TEMPLATE_ID;
  const now = new Date().toISOString();
  const job = {
    id,
    title: body.title || file.originalname,
    template,
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
  info('Nouveau job créé', { jobId: id, filename: file.originalname, template });
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
    warn('Suppression demandée pour un job inexistant', { jobId: id });
    return;
  }
  info('Suppression d\'un job', { jobId: id });
  if (job.uploadPath && fs.existsSync(job.uploadPath)) {
    fs.unlinkSync(job.uploadPath);
  }
  if (job.processedPath && fs.existsSync(job.processedPath)) {
    fs.unlinkSync(job.processedPath);
  }
  removeJobDirectory(id);
  deleteJob(id);
}
