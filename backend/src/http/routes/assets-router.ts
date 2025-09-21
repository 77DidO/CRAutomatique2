import { Router, type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createHttpError } from '../../utils/http-error.js';
import type { Environment, JobStore } from '../../types/index.js';

interface CreateAssetsRouterOptions {
  environment: Environment;
  jobStore: JobStore;
}

export function createAssetsRouter({ environment, jobStore }: CreateAssetsRouterOptions): Router {
  const router = Router();

  router.get('/:jobId/:filename', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await jobStore.get(req.params.jobId);
      if (!job) {
        throw createHttpError(404, 'Job not found');
      }
      const filePath = path.join(environment.jobsDir, job.id, req.params.filename);
      await fs.promises.access(filePath, fs.constants.R_OK);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
