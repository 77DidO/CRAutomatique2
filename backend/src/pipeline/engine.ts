import { createHttpError } from '../utils/http-error.js';
import { ingestStep } from './steps/ingest-step.js';
import { transcribeStep } from './steps/transcribe-step.js';
import { diarizeStep } from './steps/diarize-step.js';
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
    if (!this.running.has(jobId)) {
      const index = this.queue.indexOf(jobId);
      if (index !== -1) {
        this.queue.splice(index, 1);
        this.logger.debug({ jobId, queueLength: this.queue.length }, 'Pipeline job removed from queue due to cancellation');
      }
    }
    this.logger.info({ jobId }, 'Pipeline job cancellation requested');
  }

  private async processNext(): Promise<void> {
    // Évite l'exécution concurrente de plusieurs jobs afin de préserver les ressources locales.
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
      const jobStillExists = (await this.jobStore.get(nextId)) !== null;
      if (isCancelledError(error)) {
        this.logger.info({ jobId: nextId }, 'Pipeline job cancelled before completion');
        if (jobStillExists) {
          await this.jobStore.update(nextId, { status: 'failed' });
          await this.jobStore.appendLog(nextId, 'Pipeline annulé par l’utilisateur', 'warn');
        } else {
          this.logger.debug({ jobId: nextId }, 'Skipping cancellation persistence because job no longer exists');
        }
      } else {
        this.logger.error(
          { error: serialiseError(error), jobId: nextId },
          'Pipeline execution failed',
        );
        if (jobStillExists) {
          await this.jobStore.update(nextId, { status: 'failed' });
          await this.jobStore.appendLog(nextId, `Pipeline failed: ${error.message}`, 'error');
        } else {
          this.logger.debug({ jobId: nextId }, 'Skipping failure persistence because job no longer exists');
        }
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
      this.logger.debug({ jobId }, 'Skipping pipeline run because job no longer exists');
      return;
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

    // Chaque étape enrichit ce contexte partagé, évitant des relectures I/O inutiles entre deux phases.
    const steps: Array<{ name: string; handler: PipelineStep }> = [
      { name: 'ingest', handler: ingestStep },
      { name: 'transcribe', handler: transcribeStep },
      { name: 'diarize', handler: diarizeStep },
      { name: 'summarise', handler: summariseStep },
      { name: 'export', handler: exportStep },
    ];
    const stepCount = steps.length;

    for (const [index, step] of steps.entries()) {
      if (this.cancellations.has(jobId)) {
        this.logger.info({ jobId, step: step.name, index, totalSteps: stepCount }, 'Pipeline job cancelled');
        throw createHttpError(499, 'Pipeline cancelled');
      }
      const progressBefore = Math.round((index / stepCount) * 100);
      this.logger.debug(
        { jobId, step: step.name, index, totalSteps: stepCount, progress: progressBefore },
        'Pipeline step starting',
      );
      await step.handler(context);
      const progress = Math.round(((index + 1) / stepCount) * 100);
      await this.jobStore.update(jobId, { progress });
      this.logger.info(
        { jobId, step: step.name, index, totalSteps: stepCount, progress },
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
  // Privilégie le modèle explicitement demandé, sinon applique une stratégie de repli.
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
