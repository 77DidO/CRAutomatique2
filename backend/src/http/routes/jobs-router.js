import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { createHttpError } from '../../utils/http-error.js';
import { ensureDirectory } from '../../utils/fs.js';

const uploadRoot = path.join(process.cwd(), 'tmp', 'uploads');
ensureDirectory(uploadRoot);
const upload = multer({ dest: uploadRoot });

export function createJobsRouter({ jobStore, pipeline }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const jobs = await jobStore.list();
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const job = await jobStore.get(req.params.id);
      if (!job) {
        throw createHttpError(404, 'Job not found');
      }
      res.json(job);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/logs', async (req, res, next) => {
    try {
      const logs = await jobStore.getLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const job = await jobStore.get(req.params.id);
      if (!job) {
        throw createHttpError(404, 'Job not found');
      }
      await pipeline.cancel(job.id);
      await jobStore.remove(job.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post('/', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        throw createHttpError(400, 'Audio file is required');
      }

      const job = await jobStore.create({
        filename: req.file.originalname,
        tempPath: req.file.path,
        templateId: req.body.templateId || null,
        participants: (req.body.participants || '')
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
      });

      await pipeline.enqueue(job.id);

      res.status(201).json(job);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
