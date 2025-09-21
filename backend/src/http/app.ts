import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'node:path';
import { createJobsRouter } from './routes/jobs-router.js';
import { createConfigRouter } from './routes/config-router.js';
import { createTemplatesRouter } from './routes/templates-router.js';
import { createAssetsRouter } from './routes/assets-router.js';
import type {
  ConfigStore,
  Environment,
  HttpError,
  JobStore,
  Logger,
  TemplateStore,
} from '../types/index.js';
import type { PipelineEngine } from '../pipeline/engine.js';

interface CreateHttpAppOptions {
  jobStore: JobStore;
  configStore: ConfigStore;
  templateStore: TemplateStore;
  pipeline: PipelineEngine;
  environment: Environment;
  logger: Logger;
}

export function createHttpApp(options: CreateHttpAppOptions): Application {
  const { jobStore, configStore, templateStore, pipeline, environment, logger } = options;
  const app = express();

  app.use(cors());
  app.use(bodyParser.json({ limit: '2mb' }));

  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', whisper: environment.whisperBinary, ffmpeg: environment.ffmpegBinary });
  });

  app.use('/api/items', createJobsRouter({ jobStore, pipeline, environment }));
  app.use('/api/config', createConfigRouter({ configStore }));
  app.use('/api/templates', createTemplatesRouter({ templateStore }));
  app.use('/api/assets', createAssetsRouter({ environment, jobStore }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const error = err as HttpError;
    logger.error({ err: error }, 'Unhandled error');
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error',
      details: error.details,
    });
  });

  app.use(express.static(path.join(environment.rootDir, 'public')));

  return app;
}
