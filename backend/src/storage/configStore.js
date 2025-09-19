import { readFile, writeFile } from 'fs/promises';
import { CONFIG_FILE } from '../config/paths.js';

export class ConfigStore {
  constructor() {
    this.config = null;
  }

  async init() {
    this.config = await this.readConfig();
  }

  async readConfig() {
    const content = await readFile(CONFIG_FILE, 'utf8');
    if (content.trim().length === 0) {
      return {};
    }
    return JSON.parse(content);
  }

  async get() {
    if (!this.config) {
      this.config = await this.readConfig();
    }
    return this.config;
  }

  async set(nextConfig) {
    this.config = nextConfig;
    const payload = JSON.stringify(nextConfig, null, 2);
    await writeFile(CONFIG_FILE, `${payload}\n`, 'utf8');
    return this.config;
  }

  async merge(partialConfig) {
    const current = await this.get();
    const merged = structuredClone(current);

    const deepMerge = (target, source) => {
      Object.entries(source).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          deepMerge(target[key], value);
        } else {
          target[key] = value;
        }
      });
    };

    deepMerge(merged, partialConfig);
    return this.set(merged);
  }
}
