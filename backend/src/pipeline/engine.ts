import { createHttpError } from '../utils/http-error.js';
import { ingestStep } from './steps/ingest-step.js';
import { transcribeStep } from './steps/transcribe-step.js';
import { summariseStep } from './steps/summarise-step.js';
import { exportStep } from './steps/export-step.js';
import type {
  ConfigStore,
  Environment,
  HttpError,
  Job,
  JobStore,
  Logger,
  PipelineContext,
  PipelineStep,
  Services,
  Template,
  TemplateStore,
} from '../types/index.js';

interface PipelineEngineOptions {
  environment: Environment;
  jobStore: JobStore;
  configStore: ConfigStore;
  templateStore: TemplateStore;
  services: Services;
  logger: Logger;
}

export function createPipelineEngine(options: PipelineEngineOptions): PipelineEngine {
  return new PipelineEngine(options);
}

export class PipelineEngine {
  private readonly environment: Environment;

  private readonly jobStore: JobStore;

  private readonly configStore: ConfigStore;

  private readonly templateStore: TemplateStore;

  private readonly services: Services;

  private readonly logger: Logger;

  private readonly queue: string[] = [];

  private readonly running = new Set<string>();

  private readonly cancellations = new Set<string>();

  constructor(options: PipelineEngineOptions) {
    this.environment = options.environment;
    this.jobStore = options.jobStore;
    this.configStore = options.configStore;
    this.templateStore = options.templateStore;
    this.services = options.services;
    this.logger = options.logger;
  }

  async resume(): Promise<void> {
    const jobs = await this.jobStore.list();
    for (const job of jobs) {
      if (job.status === 'queued' || job.status === 'processing') {
        await this.enqueue(job.id);
      }
    }
  }

  async enqueue(jobId: string): Promise<void> {
    const wasQueued = this.queue.includes(jobId);
    if (!wasQueued) {
      this.queue.push(jobId);
      this.logger.info({ jobId, queueLength: this.queue.length }, 'Pipeline job enqueued');
    } else {
      this.logger.debug({ jobId, queueLength: this.queue.length }, 'Pipeline job already in queue');
    }
    void this.processNext();
  }

  async cancel(jobId: string): Promise<void> {
    this.cancellations.add(jobId);
    this.logger.info({ jobId }, 'Pipeline job cancellation requested');
  }

  private async processNext(): Promise<void> {
    if (this.running.size > 0) {
      return;
    }
    const nextId = this.queue.shift();
    if (!nextId) {
      return;
    }
    this.running.add(nextId);
    this.logger.debug({ jobId: nextId }, 'Pipeline job dequeued for processing');
    try {
      await this.runJob(nextId);
    } catch (unknownError) {
      const error = normaliseError(unknownError);
      if (isCancelledError(error)) {
        this.logger.info({ jobId: nextId }, 'Pipeline job cancelled before completion');
        await this.jobStore.update(nextId, { status: 'failed' });
        await this.jobStore.appendLog(nextId, 'Pipeline annulé par l’utilisateur', 'warn');
      } else {
        this.logger.error(
          { error: serialiseError(error), jobId: nextId },
          'Pipeline execution failed',
        );
        await this.jobStore.update(nextId, { status: 'failed' });
        await this.jobStore.appendLog(nextId, `Pipeline failed: ${error.message}`, 'error');
      }
    } finally {
      this.running.delete(nextId);
      this.cancellations.delete(nextId);
      if (this.queue.length > 0) {
        setImmediate(() => {
          void this.processNext();
        });
      }
    }
  }

  private async runJob(jobId: string): Promise<void> {
    const job = await this.jobStore.get(jobId);
    if (!job) {
      throw new Error(`Unknown job ${jobId}`);
    }

    await this.jobStore.update(jobId, { status: 'processing', progress: 0 });
    await this.jobStore.appendLog(jobId, 'Pipeline démarré');
    this.logger.info({ jobId, filename: job.filename, templateId: job.templateId }, 'Pipeline job started');

    const config = await this.configStore.read();
    const templates = await this.templateStore.list();
    const template = selectTemplate(templates, job);

    const context: PipelineContext = {
      job,
      config,
      template,
      environment: this.environment,
      services: this.services,
      jobStore: this.jobStore,
      logger: this.logger,
      data: {},
    };

    const steps: Array<{ name: string; handler: PipelineStep }> = [
      { name: 'ingest', handler: ingestStep },
      { name: 'transcribe', handler: transcribeStep },
      { name: 'summarise', handler: summariseStep },
      { name: 'export', handler: exportStep },
    ];

    for (const [index, step] of steps.entries()) {
      if (this.cancellations.has(jobId)) {
        this.logger.info({ jobId, step: step.name, index, totalSteps: steps.length }, 'Pipeline job cancelled');
        throw createHttpError(499, 'Pipeline cancelled');
      }
      const progressBefore = Math.round((index / steps.length) * 100);
      this.logger.debug(
        { jobId, step: step.name, index, totalSteps: steps.length, progress: progressBefore },
        'Pipeline step starting',
      );
      await step.handler(context);
      const progress = Math.round(((index + 1) / steps.length) * 100);
      await this.jobStore.update(jobId, { progress });
      this.logger.info(
        { jobId, step: step.name, index, totalSteps: steps.length, progress },
        'Pipeline step completed',
      );
    }

    await this.jobStore.update(jobId, { status: 'completed' });
    await this.jobStore.appendLog(jobId, 'Pipeline terminé avec succès');
    this.logger.info({ jobId }, 'Pipeline job completed successfully');
  }
}

function selectTemplate(templates: Template[], job: Job): Template {
  if (templates.length === 0) {
    throw new Error('No templates available');
  }
  return templates.find((tpl) => tpl.id === job.templateId) ?? templates[0];
}

function normaliseError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('Unknown error');
}

function isCancelledError(error: Error): error is HttpError {
  return typeof (error as Partial<HttpError>).status === 'number' && (error as Partial<HttpError>).status === 499;
}

function serialiseError(error: Error): { message: string; name: string; stack?: string } {
  const { message, name, stack } = error;
  return typeof stack === 'string' ? { message, name, stack } : { message, name };
}
