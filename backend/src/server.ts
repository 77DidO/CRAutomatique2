import type { Server } from 'node:http';
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
import type { Services } from './types/index.js';

export interface ApplicationServer {
  start(port: number): Promise<{ serverInstance: Server }>;
}

export async function createServer(): Promise<ApplicationServer> {
  const logger = createLogger();
  const environment = await ensureDataEnvironment({ logger });

  const jobStore = await createJobRepository(environment, { logger });
  const configStore = await createConfigRepository(environment, { logger });
  const templateStore = await createTemplateRepository(environment, { logger });

  await validateEnvironment({ logger, configStore });

  const services: Services = {
    whisper: createWhisperService(environment, { logger }),
    ffmpeg: createFfmpegService(environment),
    openai: createOpenAiService({ logger, configStore }),
  };

  const pipeline = createPipelineEngine({
    environment,
    jobStore,
    configStore,
    templateStore,
    services,
    logger,
  });

  const app = createHttpApp({
    jobStore,
    configStore,
    templateStore,
    pipeline,
    environment,
    logger,
  });

  return {
    start(port: number) {
      return new Promise<{ serverInstance: Server }>((resolve) => {
        const serverInstance = app.listen(port, () => {
          logger.info({ port }, 'HTTP server listening');
          resolve({ serverInstance });
        }) as Server;
        void pipeline.resume();
      });
    },
  };
}
