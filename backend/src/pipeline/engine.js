import { createHttpError } from '../utils/http-error.js';
import { ingestStep } from './steps/ingest-step.js';
import { transcribeStep } from './steps/transcribe-step.js';
import { summariseStep } from './steps/summarise-step.js';
import { exportStep } from './steps/export-step.js';

export function createPipelineEngine({ environment, jobStore, configStore, templateStore, services, logger }) {
  return new PipelineEngine({ environment, jobStore, configStore, templateStore, services, logger });
}

class PipelineEngine {
  constructor({ environment, jobStore, configStore, templateStore, services, logger }) {
    this.environment = environment;
    this.jobStore = jobStore;
    this.configStore = configStore;
    this.templateStore = templateStore;
    this.services = services;
    this.logger = logger;
    this.queue = [];
    this.running = new Set();
    this.cancellations = new Set();
  }

  async resume() {
    const jobs = await this.jobStore.list();
    for (const job of jobs) {
      if (job.status === 'queued' || job.status === 'processing') {
        await this.enqueue(job.id);
      }
    }
  }

  async enqueue(jobId) {
    if (!this.queue.includes(jobId)) {
      this.queue.push(jobId);
    }
    this.processNext();
  }

  async cancel(jobId) {
    this.cancellations.add(jobId);
  }

  async processNext() {
    if (this.running.size > 0) {
      return;
    }
    const nextId = this.queue.shift();
    if (!nextId) return;
    this.running.add(nextId);
    try {
      await this.runJob(nextId);
    } catch (error) {
      this.logger.error({ error, jobId: nextId }, 'Pipeline execution failed');
      await this.jobStore.update(nextId, { status: 'failed' });
      await this.jobStore.appendLog(nextId, `Pipeline failed: ${error.message}`, 'error');
    } finally {
      this.running.delete(nextId);
      this.cancellations.delete(nextId);
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  async runJob(jobId) {
    const job = await this.jobStore.get(jobId);
    if (!job) {
      throw new Error(`Unknown job ${jobId}`);
    }

    await this.jobStore.update(jobId, { status: 'processing', progress: 0 });
    await this.jobStore.appendLog(jobId, 'Pipeline démarré');

    const config = await this.configStore.read();
    const templates = await this.templateStore.list();
    const template = templates.find((tpl) => tpl.id === job.templateId) || templates[0];

    const context = {
      job,
      config,
      template,
      environment: this.environment,
      services: this.services,
      jobStore: this.jobStore,
      data: {},
    };

    const steps = [
      ingestStep,
      transcribeStep,
      summariseStep,
      exportStep,
    ];

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
