import express from 'express';
import multer from 'multer';
import path from 'path';
import { rename, unlink } from 'fs/promises';
import { v4 as uuid } from 'uuid';
import { createInitialSteps, runPipeline } from '../workflow/index.js';
import { parseParticipants } from '../utils/participants.js';
import { jobAssetPath, UPLOADS_DIR } from '../config/paths.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  })
});

function buildAssetUrl(jobId, filename) {
  return `/api/assets/${jobId}/${encodeURIComponent(filename)}`;
}

function serializeJob(job, { includeLogs = false } = {}) {
  if (!job) {
    return null;
  }

  const serialized = {
    ...job,
    source: job.source
      ? {
          ...job.source,
          url: buildAssetUrl(job.id, job.source.storedName)
        }
      : null,
    outputs: Array.isArray(job.outputs)
      ? job.outputs.map((output) => ({
          ...output,
          url: buildAssetUrl(job.id, output.filename)
        }))
      : []
  };

  if (!includeLogs) {
    delete serialized.logs;
  }

  return serialized;
}

export function createItemsRouter({ jobStore, templateStore, configStore }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const jobs = jobStore.list().map((job) => serializeJob(job));
    res.json(jobs);
  });

  router.post('/', upload.single('file'), async (req, res, next) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier n\'a été fourni.' });
      }

      const jobId = uuid();
      const title = (req.body.title ?? '').trim();
      const template = (req.body.template ?? '').trim() || 'default';
      const participants = parseParticipants(req.body.participants);

      await jobStore.ensureJobDirectory(jobId);

      const sourceName = `source${path.extname(req.file.originalname) || path.extname(req.file.filename)}`;
      const destinationPath = jobAssetPath(jobId, sourceName);
      await rename(req.file.path, destinationPath);

      const now = new Date().toISOString();
      const job = {
        id: jobId,
        title: title || req.file.originalname,
        template,
        participants,
        status: 'queued',
        progress: 0,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        currentStep: null,
        steps: createInitialSteps(),
        logs: [],
        outputs: [],
        source: {
          originalName: req.file.originalname,
          storedName: sourceName,
          mimeType: req.file.mimetype,
          size: req.file.size
        }
      };

      await jobStore.create(job);
      await jobStore.appendLog(jobId, 'Traitement en file d\'attente.');

      runPipeline({ jobId, jobStore, templateStore, configStore }).catch((error) => {
        // Erreur non interceptée dans le pipeline, journaliser et signaler.
        console.error('Pipeline error', error);
      });

      const created = jobStore.get(jobId);
      res.status(201).json(serializeJob(created));
    } catch (error) {
      if (tempPath) {
        await unlink(tempPath).catch(() => {});
      }
      next(error);
    }
  });

  router.get('/:id', (req, res) => {
    const job = jobStore.get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job introuvable.' });
    }
    res.json(serializeJob(job, { includeLogs: true }));
  });

  router.get('/:id/logs', (req, res) => {
    const job = jobStore.get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job introuvable.' });
    }
    res.json(job.logs ?? []);
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const job = jobStore.get(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job introuvable.' });
      }

      await jobStore.removeJobDirectory(job.id);
      await jobStore.remove(job.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
