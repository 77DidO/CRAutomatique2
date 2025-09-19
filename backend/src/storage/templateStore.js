import { randomUUID } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { TEMPLATES_FILE } from '../config/paths.js';

export class TemplateStore {
  constructor() {
    this.templates = [];
  }

  async init() {
    const content = await readFile(TEMPLATES_FILE, 'utf8');
    if (content.trim().length === 0) {
      this.templates = [];
      return;
    }
    const parsed = JSON.parse(content);
    this.templates = Array.isArray(parsed)
      ? parsed.map((template) => ({
        ...template,
        prompt: typeof template.prompt === 'string' ? template.prompt : ''
      }))
      : [];
  }

  all() {
    return this.templates;
  }

  getById(id) {
    return this.templates.find((template) => template.id === id) ?? null;
  }

  async save() {
    const payload = JSON.stringify(this.templates, null, 2);
    await writeFile(TEMPLATES_FILE, `${payload}\n`, 'utf8');
  }

  async create(partialTemplate) {
    const template = this.normalizeTemplate({
      ...partialTemplate,
      id: partialTemplate?.id ?? randomUUID()
    });

    this.templates.push(template);
    await this.save();
    return template;
  }

  async update(id, partialTemplate) {
    const index = this.templates.findIndex((template) => template.id === id);
    if (index === -1) {
      return null;
    }

    const current = this.templates[index];
    const next = this.normalizeTemplate({ ...current, ...partialTemplate, id: current.id });
    this.templates[index] = next;
    await this.save();
    return next;
  }

  async delete(id) {
    const index = this.templates.findIndex((template) => template.id === id);
    if (index === -1) {
      return false;
    }

    this.templates.splice(index, 1);
    await this.save();
    return true;
  }

  normalizeTemplate(template) {
    const promptValue = template.prompt ?? '';
    return {
      id: template.id,
      name: template.name?.trim() ?? '',
      description: template.description?.trim() ?? '',
      prompt: (typeof promptValue === 'string' ? promptValue : String(promptValue)).trim()
    };
  }
}
