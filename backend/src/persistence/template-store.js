import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

export async function createTemplateRepository(environment, { logger }) {
  const store = new JsonTemplateStore(environment.templatesFile, logger);
  await store.initialise();
  return store;
}

class JsonTemplateStore {
  constructor(filePath, logger) {
    this.filePath = filePath;
    this.logger = logger;
    this.templates = [];
  }

  async initialise() {
    const raw = await fs.promises.readFile(this.filePath, 'utf8');
    const data = JSON.parse(raw || '{}');
    this.templates = data.templates || [];
  }

  async persist() {
    await fs.promises.writeFile(this.filePath, JSON.stringify({ templates: this.templates }, null, 2), 'utf8');
  }

  async list() {
    return this.templates;
  }

  async create(payload) {
    const template = normaliseTemplate({ ...payload, id: payload.id || randomUUID() });
    this.templates.push(template);
    await this.persist();
    return template;
  }

  async update(id, payload) {
    const index = this.templates.findIndex((tpl) => tpl.id === id);
    if (index === -1) {
      throw new Error(`Unknown template ${id}`);
    }
    const updated = normaliseTemplate({ ...this.templates[index], ...payload, id });
    this.templates[index] = updated;
    await this.persist();
    return updated;
  }

  async remove(id) {
    this.templates = this.templates.filter((tpl) => tpl.id !== id);
    await this.persist();
  }
}

function normaliseTemplate({ id, name, description, prompt }) {
  if (!name) {
    throw new Error('Template name is required');
  }
  if (!prompt) {
    throw new Error('Template prompt is required');
  }
  return {
    id,
    name,
    description: description || '',
    prompt,
  };
}
