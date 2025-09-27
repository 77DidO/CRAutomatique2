import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import { createHttpError } from '../../utils/http-error.js';
import { ensureDirectory } from '../../utils/fs.js';
import type { Environment, JobStore } from '../../types/index.js';
import type { PipelineEngine } from '../../pipeline/engine.js';

interface CreateJobsRouterOptions {
  jobStore: JobStore;
  pipeline: PipelineEngine;
  environment: Environment;
}

export function createJobsRouter({ jobStore, pipeline, environment }: CreateJobsRouterOptions): Router {
  const uploadRoot = path.join(environment.tmpDir, 'uploads');
  ensureDirectory(uploadRoot);
  const upload = multer({ dest: uploadRoot });
  const router = Router();

  type UploadedFile = { originalname: string; path: string };

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = await jobStore.list();
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

  router.get('/:id/logs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await jobStore.getLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

  router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file as UploadedFile | undefined;
      if (!file) {
        throw createHttpError(400, 'Audio file is required');
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const rawParticipants = typeof body.participants === 'string' ? (body.participants as string) : '';
      const participants = rawParticipants
        .split(',')
        .map((participant: string) => participant.trim())
        .filter(Boolean);

      const templateId = typeof body.templateId === 'string' ? (body.templateId as string) : null;

      const job = await jobStore.create({
        filename: file.originalname,
        tempPath: file.path,
        templateId,
        participants,
      });

      await pipeline.enqueue(job.id);

      res.status(201).json(job);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
