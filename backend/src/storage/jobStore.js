import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { JOBS_FILE, jobDirectory } from '../config/paths.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class JobStore {
  constructor() {
    this.jobs = new Map();
  }

  async init() {
    try {
      const content = await readFile(JOBS_FILE, 'utf8');
      if (content.trim().length === 0) {
        return;
      }
      const parsed = JSON.parse(content);
      parsed.forEach((job) => {
        this.jobs.set(job.id, job);
      });
    } catch (error) {
      // Initialise with an empty store if the file does not exist or is invalid.
      this.jobs.clear();
    }
  }

  async persist() {
    const payload = JSON.stringify(Array.from(this.jobs.values()), null, 2);
    await writeFile(JOBS_FILE, `${payload}\n`, 'utf8');
  }

  list() {
    return Array.from(this.jobs.values()).sort((a, b) => (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }

  get(id) {
    return this.jobs.get(id) ?? null;
  }

  async create(job) {
    this.jobs.set(job.id, job);
    await this.persist();
    return job;
  }

  async update(id, mutator) {
    const existing = this.jobs.get(id);
    if (!existing) {
      throw new Error('Job not found');
    }

    const draft = clone(existing);
    const result = await mutator(draft);
    const updated = result ?? draft;
    updated.updatedAt = new Date().toISOString();
    this.jobs.set(id, updated);
    await this.persist();
    return updated;
  }

  async appendLog(id, message) {
    return this.update(id, (job) => {
      if (!Array.isArray(job.logs)) {
        job.logs = [];
      }
      job.logs.push({
        timestamp: new Date().toISOString(),
        message
      });
      return job;
    });
  }

  async remove(id) {
    this.jobs.delete(id);
    await this.persist();
  }

  async ensureJobDirectory(id) {
    await mkdir(jobDirectory(id), { recursive: true });
  }

  async removeJobDirectory(id) {
    await rm(jobDirectory(id), { recursive: true, force: true });
  }
}
