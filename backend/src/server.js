import { createHttpApp } from './http/app.js';
import { createPipelineEngine } from './pipeline/engine.js';
import { createJobRepository } from './persistence/job-store.js';
import { createConfigRepository } from './persistence/config-store.js';
import { createTemplateRepository } from './persistence/template-store.js';
import { ensureDataEnvironment } from './utils/data-environment.js';
import { createLogger } from './utils/logger.js';
import { createWhisperService } from './services/whisper-service.js';
import { createFfmpegService } from './services/ffmpeg-service.js';
import { createOpenAiService } from './services/openai-service.js';
import { validateEnvironment } from './utils/environment-validation.js';

export async function createServer() {
  const logger = createLogger();
  validateEnvironment(logger);
  const environment = await ensureDataEnvironment({ logger });

  const jobStore = await createJobRepository(environment, { logger });
  const configStore = await createConfigRepository(environment, { logger });
  const templateStore = await createTemplateRepository(environment, { logger });

  const whisper = createWhisperService(environment, { logger });
  const ffmpeg = createFfmpegService(environment, { logger });
  const openai = createOpenAiService({ logger, configStore });

  const pipeline = createPipelineEngine({
    environment,
    jobStore,
    configStore,
    templateStore,
    services: { whisper, ffmpeg, openai },
    logger,
  });

  const app = createHttpApp({
    jobStore,
    configStore,
    templateStore,
    pipeline,
    environment,
    services: { whisper, ffmpeg, openai },
    logger,
  });

  return {
    start(port) {
      return new Promise((resolve) => {
        const serverInstance = app.listen(port, () => {
          logger.info({ port }, 'HTTP server listening');
          resolve({ serverInstance });
        });
        pipeline.resume();
      });
    },
  };
}
