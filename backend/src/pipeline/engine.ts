import { createHttpError } from '../utils/http-error.js';
import { ingestStep } from './steps/ingest-step.js';
import { transcribeStep } from './steps/transcribe-step.js';
import { summariseStep } from './steps/summarise-step.js';
import { exportStep } from './steps/export-step.js';
import type {
  ConfigStore,
  Environment,
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
    if (!this.queue.includes(jobId)) {
      this.queue.push(jobId);
    }
    void this.processNext();
  }

  async cancel(jobId: string): Promise<void> {
    this.cancellations.add(jobId);
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
    try {
      await this.runJob(nextId);
    } catch (unknownError) {
      const error = normaliseError(unknownError);
      this.logger.error({ error, jobId: nextId }, 'Pipeline execution failed');
      await this.jobStore.update(nextId, { status: 'failed' });
      await this.jobStore.appendLog(nextId, `Pipeline failed: ${error.message}`, 'error');
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
      data: {},
    };

    const steps: PipelineStep[] = [ingestStep, transcribeStep, summariseStep, exportStep];

    for (const [index, step] of steps.entries()) {
      if (this.cancellations.has(jobId)) {
        throw createHttpError(499, 'Pipeline cancelled');
      }
      await step(context);
      await this.jobStore.update(jobId, { progress: Math.round(((index + 1) / steps.length) * 100) });
    }

    await this.jobStore.update(jobId, { status: 'completed' });
    await this.jobStore.appendLog(jobId, 'Pipeline terminé avec succès');
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
