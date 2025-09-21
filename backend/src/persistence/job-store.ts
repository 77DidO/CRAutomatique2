import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDirectory } from '../utils/fs.js';
import type {
  Environment,
  Job,
  JobLogEntry,
  JobOutput,
  JobStore,
  JobsFilePayload,
  Logger,
  LogLevel,
} from '../types/index.js';

interface CreateJobRepositoryOptions {
  logger: Logger;
}

export async function createJobRepository(environment: Environment, { logger }: CreateJobRepositoryOptions): Promise<JobStore> {
  const store = new FileJobStore(environment, logger);
  await store.initialise();
  return store;
}

class FileJobStore implements JobStore {
  private readonly environment: Environment;

  private readonly logger: Logger;

  private readonly jobs = new Map<string, Job>();

  private readonly logs = new Map<string, JobLogEntry[]>();

  constructor(environment: Environment, logger: Logger) {
    this.environment = environment;
    this.logger = logger;
  }

  async initialise(): Promise<void> {
    const raw = await fs.promises.readFile(this.environment.jobsFile, 'utf8');
    const data = this.parsePayload(raw);
    for (const job of data.jobs ?? []) {
      this.jobs.set(job.id, job);
    }
    for (const [jobId, entries] of Object.entries(data.logs ?? {})) {
      this.logs.set(jobId, entries);
    }
  }

  private async persist(): Promise<void> {
    const payload: JobsFilePayload = {
      jobs: Array.from(this.jobs.values()),
      logs: Object.fromEntries(this.logs.entries()),
    };
    await fs.promises.writeFile(this.environment.jobsFile, JSON.stringify(payload, null, 2), 'utf8');
  }

  async list(): Promise<Job[]> {
    return Array.from(this.jobs.values()).sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
  }

  async get(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async create({ filename, tempPath, templateId, participants }: {
    filename: string;
    tempPath: string;
    templateId: string | null;
    participants: string[];
  }): Promise<Job> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const jobDir = path.join(this.environment.jobsDir, id);
    ensureDirectory(jobDir);

    const job: Job = {
      id,
      filename,
      templateId,
      participants,
      status: 'queued',
      createdAt,
      updatedAt: createdAt,
      progress: 0,
      outputs: [],
    };

    this.jobs.set(id, job);
    this.logs.set(id, []);
    await this.persist();

    await fs.promises.rename(tempPath, path.join(jobDir, filename));

    await this.appendLog(id, 'Job created and queued');

    return job;
  }

  async update(id: string, updates: Partial<Job>): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Unknown job ${id}`);
    }
    const updated: Job = { ...job, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    await this.persist();
    return updated;
  }

  async appendLog(id: string, message: string, level: LogLevel = 'info'): Promise<JobLogEntry> {
    const entries = this.logs.get(id) ?? [];
    const entry: JobLogEntry = { timestamp: new Date().toISOString(), level, message };
    entries.push(entry);
    this.logs.set(id, entries);
    await this.persist();
    return entry;
  }

  async getLogs(id: string): Promise<JobLogEntry[]> {
    return this.logs.get(id) ?? [];
  }

  async addOutput(id: string, output: JobOutput): Promise<Job> {
    const job = await this.get(id);
    if (!job) {
      throw new Error(`Unknown job ${id}`);
    }
    const outputs = [...(job.outputs ?? []), output];
    return this.update(id, { outputs });
  }

  async remove(id: string): Promise<void> {
    const job = await this.get(id);
    if (!job) {
      return;
    }

    this.jobs.delete(id);
    this.logs.delete(id);
    await this.persist();

    const jobDir = path.join(this.environment.jobsDir, id);
    await fs.promises.rm(jobDir, { recursive: true, force: true });
  }
  private parsePayload(raw: string): Partial<JobsFilePayload> {
    if (!raw) {
      return { jobs: [], logs: {} };
    }
    try {
      return JSON.parse(raw) as Partial<JobsFilePayload>;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown parse error');
      this.logger.error({ err }, 'Failed to parse jobs payload, resetting state');
      return { jobs: [], logs: {} };
    }
  }
}
