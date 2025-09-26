import fs from 'node:fs';
import type { AppConfig, ConfigStore, DeepPartial, Logger } from '../types/index.js';

const PIPELINE_DEFAULTS = {
  enableSummaries: true,
  enableSubtitles: true,
  enableDiarization: false,
} as const;

interface CreateConfigRepositoryOptions {
  logger: Logger;
}

export async function createConfigRepository(environment: { configFile: string }, { logger }: CreateConfigRepositoryOptions): Promise<ConfigStore> {
  const store = new JsonConfigStore(environment.configFile, logger);
  await store.initialise();
  return store;
}

class JsonConfigStore implements ConfigStore {
  private readonly filePath: string;

  private readonly logger: Logger;

  private cache: AppConfig | null = null;

  constructor(filePath: string, logger: Logger) {
    this.filePath = filePath;
    this.logger = logger;
  }

  async initialise(): Promise<void> {
    this.cache = await this.read();
  }

  async read(): Promise<AppConfig> {
    if (this.cache) {
      return this.cache;
    }
    const raw = await fs.promises.readFile(this.filePath, 'utf8');
    try {
      const parsed = JSON.parse(raw || '{}') as AppConfig;
      this.cache = applyConfigDefaults(parsed);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown config parse error');
      this.logger.error({ err }, 'Failed to parse configuration, returning empty object');
      this.cache = applyConfigDefaults({} as AppConfig);
    }
    return this.cache;
  }

  async write(patch: DeepPartial<AppConfig>): Promise<AppConfig> {
    const current = await this.read();
    this.cache = applyConfigDefaults(merge(current, patch));
    await fs.promises.writeFile(this.filePath, JSON.stringify(this.cache, null, 2), 'utf8');
    return this.cache;
  }
}

function applyConfigDefaults(config: AppConfig): AppConfig {
  const pipeline = config?.pipeline ? { ...config.pipeline } : {};
  return {
    ...config,
    pipeline: { ...PIPELINE_DEFAULTS, ...pipeline },
  } as AppConfig;
}

function merge<T>(target: T, patch: DeepPartial<T>): T {
  if (Array.isArray(patch)) {
    return [...patch] as unknown as T;
  }
  if (typeof patch !== 'object' || patch === null) {
    return patch as T;
  }
  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    const currentValue = (target as Record<string, unknown> | undefined)?.[key];
    result[key] = merge(currentValue as never, value as never);
  }
  return result as T;
}
