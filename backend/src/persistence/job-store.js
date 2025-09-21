import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDirectory } from '../utils/fs.js';

export async function createJobRepository(environment, { logger }) {
  const store = new FileJobStore(environment, logger);
  await store.initialise();
  return store;
}

class FileJobStore {
  constructor(environment, logger) {
    this.environment = environment;
    this.logger = logger;
    this.jobs = new Map();
    this.logs = new Map();
  }

  async initialise() {
    const raw = await fs.promises.readFile(this.environment.jobsFile, 'utf8');
    const data = JSON.parse(raw || '{}');
    for (const job of data.jobs || []) {
      this.jobs.set(job.id, job);
    }
    for (const [jobId, entries] of Object.entries(data.logs || {})) {
      this.logs.set(jobId, entries);
    }
  }

  async persist() {
    const payload = {
      jobs: Array.from(this.jobs.values()),
      logs: Object.fromEntries(this.logs.entries()),
    };
    await fs.promises.writeFile(this.environment.jobsFile, JSON.stringify(payload, null, 2), 'utf8');
  }

  async list() {
    return Array.from(this.jobs.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async get(id) {
    return this.jobs.get(id) || null;
  }

  async create({ filename, tempPath, templateId, participants }) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const jobDir = path.join(this.environment.jobsDir, id);
    ensureDirectory(jobDir);

    const job = {
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

  async update(id, updates) {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Unknown job ${id}`);
    }
    const updated = { ...job, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    await this.persist();
    return updated;
  }

  async appendLog(id, message, level = 'info') {
    const entries = this.logs.get(id) || [];
    const entry = { timestamp: new Date().toISOString(), level, message };
    entries.push(entry);
    this.logs.set(id, entries);
    await this.persist();
    return entry;
  }

  async getLogs(id) {
    return this.logs.get(id) || [];
  }

  async addOutput(id, output) {
    const job = await this.get(id);
    if (!job) throw new Error(`Unknown job ${id}`);
    const outputs = [...(job.outputs || []), output];
    return this.update(id, { outputs });
  }

  async remove(id) {
    const job = await this.get(id);
    if (!job) return;

    this.jobs.delete(id);
    this.logs.delete(id);
    await this.persist();

    const jobDir = path.join(this.environment.jobsDir, id);
    await fs.promises.rm(jobDir, { recursive: true, force: true });
  }
}
