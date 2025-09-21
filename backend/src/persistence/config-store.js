import fs from 'node:fs';

export async function createConfigRepository(environment, { logger }) {
  const store = new JsonConfigStore(environment.configFile, logger);
  await store.initialise();
  return store;
}

class JsonConfigStore {
  constructor(filePath, logger) {
    this.filePath = filePath;
    this.logger = logger;
    this.cache = null;
  }

  async initialise() {
    this.cache = await this.read();
  }

  async read() {
    if (this.cache) return this.cache;
    const raw = await fs.promises.readFile(this.filePath, 'utf8');
    this.cache = JSON.parse(raw || '{}');
    return this.cache;
  }

  async write(patch) {
    const current = await this.read();
    this.cache = merge(current, patch);
    await fs.promises.writeFile(this.filePath, JSON.stringify(this.cache, null, 2), 'utf8');
    return this.cache;
  }
}

function merge(target, patch) {
  if (Array.isArray(patch)) {
    return [...patch];
  }
  if (typeof patch !== 'object' || patch === null) {
    return patch;
  }
  const result = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = merge(target ? target[key] : undefined, value);
  }
  return result;
}
