import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createHttpError } from '../../utils/http-error.js';

export function createAssetsRouter({ environment, jobStore }) {
  const router = Router();

  router.get('/:jobId/:filename', async (req, res, next) => {
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
