import type { Server } from 'node:http';
import type { Services } from './types/index.js';

export interface ApplicationServer {
  start(port: number): Promise<{ serverInstance: Server }>;
}

interface ServerDependencies {
  createLogger: typeof import('./utils/logger.js').createLogger;
  ensureDataEnvironment: typeof import('./utils/data-environment.js').ensureDataEnvironment;
  createJobRepository: typeof import('./persistence/job-store.js').createJobRepository;
  createConfigRepository: typeof import('./persistence/config-store.js').createConfigRepository;
  createTemplateRepository: typeof import('./persistence/template-store.js').createTemplateRepository;
  validateEnvironment: typeof import('./utils/environment-validation.js').validateEnvironment;
  createWhisperService: typeof import('./services/whisper-service.js').createWhisperService;
  createFfmpegService: typeof import('./services/ffmpeg-service.js').createFfmpegService;
  createOpenAiService: typeof import('./services/openai-service.js').createOpenAiService;
  createPipelineEngine: typeof import('./pipeline/engine.js').createPipelineEngine;
  createHttpApp: typeof import('./http/app.js').createHttpApp;
}

async function loadDependencies(
  overrides: Partial<ServerDependencies>,
): Promise<ServerDependencies> {
  const dependencies: Partial<ServerDependencies> = { ...overrides };

  if (!dependencies.createLogger) {
    dependencies.createLogger = (await import('./utils/logger.js')).createLogger;
  }
  if (!dependencies.ensureDataEnvironment) {
    dependencies.ensureDataEnvironment = (await import('./utils/data-environment.js')).ensureDataEnvironment;
  }
  if (!dependencies.createJobRepository) {
    dependencies.createJobRepository = (await import('./persistence/job-store.js')).createJobRepository;
  }
  if (!dependencies.createConfigRepository) {
    dependencies.createConfigRepository = (await import('./persistence/config-store.js')).createConfigRepository;
  }
  if (!dependencies.createTemplateRepository) {
    dependencies.createTemplateRepository = (await import('./persistence/template-store.js')).createTemplateRepository;
  }
  if (!dependencies.validateEnvironment) {
    dependencies.validateEnvironment = (await import('./utils/environment-validation.js')).validateEnvironment;
  }
  if (!dependencies.createWhisperService) {
    dependencies.createWhisperService = (await import('./services/whisper-service.js')).createWhisperService;
  }
  if (!dependencies.createFfmpegService) {
    dependencies.createFfmpegService = (await import('./services/ffmpeg-service.js')).createFfmpegService;
  }
  if (!dependencies.createOpenAiService) {
    dependencies.createOpenAiService = (await import('./services/openai-service.js')).createOpenAiService;
  }
  if (!dependencies.createPipelineEngine) {
    dependencies.createPipelineEngine = (await import('./pipeline/engine.js')).createPipelineEngine;
  }
  if (!dependencies.createHttpApp) {
    dependencies.createHttpApp = (await import('./http/app.js')).createHttpApp;
  }

  return dependencies as ServerDependencies;
}

type ListenError = Error & { code?: string | number };

export async function createServer(
  overrides: Partial<ServerDependencies> = {},
): Promise<ApplicationServer> {
  const dependencies = await loadDependencies(overrides);

  const logger = dependencies.createLogger();
  const environment = await dependencies.ensureDataEnvironment({ logger });

  const jobStore = await dependencies.createJobRepository(environment, { logger });
  const configStore = await dependencies.createConfigRepository(environment, { logger });
  const templateStore = await dependencies.createTemplateRepository(environment, { logger });

  await dependencies.validateEnvironment({ logger, configStore });

  const services: Services = {
    whisper: dependencies.createWhisperService(environment, { logger }),
    ffmpeg: dependencies.createFfmpegService(environment),
    openai: dependencies.createOpenAiService({ logger, configStore }),
  };

  const pipeline = dependencies.createPipelineEngine({
    environment,
    jobStore,
    configStore,
    templateStore,
    services,
    logger,
  });

  const app = dependencies.createHttpApp({
    jobStore,
    configStore,
    templateStore,
    pipeline,
    environment,
    logger,
  });

  return {
    start(port: number) {
      return new Promise<{ serverInstance: Server }>((resolve, reject) => {
        const serverInstance = app.listen(port, () => {
          eventedServer.removeListener('error', onError);
          logger.info({ port }, 'HTTP server listening');
          resolve({ serverInstance });
        }) as Server;

        const eventedServer = serverInstance as unknown as {
          addListener(event: 'error', listener: (error: ListenError) => void): void;
          removeListener(event: 'error', listener: (error: ListenError) => void): void;
        };

        const onError = (error: ListenError) => {
          eventedServer.removeListener('error', onError);
          logger.error(
            {
              port,
              error: {
                code: typeof error.code === 'string' || typeof error.code === 'number' ? error.code : undefined,
                message: error.message,
              },
            },
            'HTTP server failed to start',
          );
          reject(error);
        };

        eventedServer.addListener('error', onError);

        void pipeline.resume();
      });
    },
  };
}
