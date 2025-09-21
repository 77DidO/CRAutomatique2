import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Logger, Template, TemplateInput, TemplateStore } from '../types/index.js';

interface CreateTemplateRepositoryOptions {
  logger: Logger;
}

export async function createTemplateRepository(environment: { templatesFile: string }, { logger }: CreateTemplateRepositoryOptions): Promise<TemplateStore> {
  const store = new JsonTemplateStore(environment.templatesFile, logger);
  await store.initialise();
  return store;
}

class JsonTemplateStore implements TemplateStore {
  private readonly filePath: string;

  private readonly logger: Logger;

  private templates: Template[] = [];

  constructor(filePath: string, logger: Logger) {
    this.filePath = filePath;
    this.logger = logger;
  }

  async initialise(): Promise<void> {
    const raw = await fs.promises.readFile(this.filePath, 'utf8');
    try {
      const data = JSON.parse(raw || '{}') as { templates?: Template[] };
      this.templates = data.templates ?? [];
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown template parse error');
      this.logger.error({ err }, 'Failed to parse templates file, resetting to empty list');
      this.templates = [];
    }
  }

  private async persist(): Promise<void> {
    await fs.promises.writeFile(this.filePath, JSON.stringify({ templates: this.templates }, null, 2), 'utf8');
  }

  async list(): Promise<Template[]> {
    return this.templates;
  }

  async create(payload: TemplateInput): Promise<Template> {
    const template = normaliseTemplate({ ...payload, id: payload.id ?? randomUUID() });
    this.templates.push(template);
    await this.persist();
    return template;
  }

  async update(id: string, payload: TemplateInput): Promise<Template> {
    const index = this.templates.findIndex((tpl) => tpl.id === id);
    if (index === -1) {
      throw new Error(`Unknown template ${id}`);
    }
    const updated = normaliseTemplate({ ...this.templates[index], ...payload, id });
    this.templates[index] = updated;
    await this.persist();
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.templates = this.templates.filter((tpl) => tpl.id !== id);
    await this.persist();
  }
}

function normaliseTemplate({ id, name, description, prompt }: TemplateInput & { id: string }): Template {
  if (!name) {
    throw new Error('Template name is required');
  }
  if (!prompt) {
    throw new Error('Template prompt is required');
  }
  return {
    id,
    name,
    description: description ?? '',
    prompt,
  };
}
