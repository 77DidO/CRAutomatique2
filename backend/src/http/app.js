import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'node:path';
import { createJobsRouter } from './routes/jobs-router.js';
import { createConfigRouter } from './routes/config-router.js';
import { createTemplatesRouter } from './routes/templates-router.js';
import { createAssetsRouter } from './routes/assets-router.js';

export function createHttpApp({ jobStore, configStore, templateStore, pipeline, environment, logger }) {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json({ limit: '2mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', whisper: environment.whisperBinary, ffmpeg: environment.ffmpegBinary });
  });

  app.use('/api/items', createJobsRouter({ jobStore, pipeline, environment, logger }));
  app.use('/api/config', createConfigRouter({ configStore, logger }));
  app.use('/api/templates', createTemplatesRouter({ templateStore, logger }));
  app.use('/api/assets', createAssetsRouter({ environment, jobStore, logger }));

  app.use((err, req, res, next) => {
    logger.error({ err }, 'Unhandled error');
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      details: err.details,
    });
  });

  app.use(express.static(path.join(environment.rootDir, 'public')));

  return app;
}
