import { readFile } from 'fs/promises';
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
    this.templates = JSON.parse(content);
  }

  all() {
    return this.templates;
  }

  getById(id) {
    return this.templates.find((template) => template.id === id) ?? null;
  }
}
