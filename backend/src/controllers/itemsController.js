import fs from 'fs';
import { listJobs, getJob } from '../services/jobStore.js';
import { createJobFromUpload, getLogs, removeJob } from '../services/watcher.js';
import { getJobFilePath } from '../utils/fileSystem.js';

export function listItems(_req, res) {
  res.json(listJobs());
}

export function getItem(req, res) {
  const job = getJob(req.params.id);
  if (!job) {
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
    return res.status(400).json({ error: 'Aucun fichier fourni.' });
  }
  try {
    const job = createJobFromUpload({ file: req.file, body: req.body });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export function getItemLogs(req, res) {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ logs: getLogs(job.id) });
}

export function deleteItem(req, res) {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  removeJob(job.id);
  res.status(204).send();
}
