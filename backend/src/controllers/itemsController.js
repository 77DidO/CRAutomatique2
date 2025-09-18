import fs from 'fs';
import { listJobs, getJob } from '../services/jobStore.js';
import { createJobFromUpload, getLogs, removeJob } from '../services/watcher.js';
import { getJobFilePath } from '../utils/fileSystem.js';
import { info, warn } from '../utils/logger.js';

export function listItems(_req, res) {
  info('Requête de listage des jobs reçue.');
  res.json(listJobs());
}

export function getItem(req, res) {
  info('Requête de récupération d\'un job', { jobId: req.params.id });
  const job = getJob(req.params.id);
  if (!job) {
    warn('Job non trouvé lors de la récupération', { jobId: req.params.id });
    return res.status(404).json({ error: 'Job not found' });
  }
  const resources = [];
  const files = [
    job.originalFilename,
    'transcription_raw.txt',
    'transcription_clean.txt',
    'summary.md',
    'summary.html',
    'segments.json',
    'subtitles.vtt'
  ];
  files.forEach((filename) => {
    const filePath = getJobFilePath(job.id, filename);
    if (fs.existsSync(filePath)) {
      resources.push({
        type: filename,
        url: `/api/assets/${job.id}/${filename}`
      });
    }
  });
  res.json({ ...job, resources, logs: getLogs(job.id) });
}

export function createItem(req, res) {
  if (!req.file) {
    warn('Tentative de création de job sans fichier');
    return res.status(400).json({ error: 'Aucun fichier fourni.' });
  }
  try {
    info('Création d\'un job à partir d\'un upload', { filename: req.file.originalname });
    const job = createJobFromUpload({ file: req.file, body: req.body });
    res.status(201).json(job);
  } catch (error) {
    warn('Erreur lors de la création d\'un job', { message: error.message });
    res.status(500).json({ error: error.message });
  }
}

export function getItemLogs(req, res) {
  info('Requête de récupération des logs d\'un job', { jobId: req.params.id });
  const job = getJob(req.params.id);
  if (!job) {
    warn('Job non trouvé lors de la récupération des logs', { jobId: req.params.id });
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ logs: getLogs(job.id) });
}

export function deleteItem(req, res) {
  info('Requête de suppression d\'un job', { jobId: req.params.id });
  const job = getJob(req.params.id);
  if (!job) {
    warn('Job non trouvé lors de la suppression', { jobId: req.params.id });
    return res.status(404).json({ error: 'Job not found' });
  }
  removeJob(job.id);
  res.status(204).send();
}
