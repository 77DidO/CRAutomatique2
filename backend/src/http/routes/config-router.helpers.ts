import type { AppConfig, DeepPartial, LlmConfig } from '../../types/index.js';

export type MaskedConfig = Omit<AppConfig, 'llm'> & {
  llm: Omit<LlmConfig, 'apiKey'> & { hasApiKey: boolean };
};

export function maskSecrets(config: AppConfig): MaskedConfig {
  const clone: MaskedConfig = {
    ...config,
    whisper: config.whisper ? { ...config.whisper } : config.whisper,
    pipeline: config.pipeline ? { ...config.pipeline } : config.pipeline,
    llm: { ...config.llm, hasApiKey: false },
  };

  const value = config.llm?.apiKey;
  clone.llm.hasApiKey = typeof value === 'string' && value.length > 0;
  if ('apiKey' in clone.llm) {
    delete (clone.llm as Partial<LlmConfig>).apiKey;
  }

  return clone;
}

export function sanitisePayload(payload: DeepPartial<AppConfig>): DeepPartial<AppConfig> {
  const clone = cloneValue(payload);

  if (!clone.llm) {
    return clone;
  }

  if ('hasApiKey' in clone.llm) {
    delete (clone.llm as { hasApiKey?: boolean }).hasApiKey;
  }

  if ('apiKey' in clone.llm) {
    const value = clone.llm.apiKey;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      clone.llm.apiKey = trimmed.length > 0 ? trimmed : null;
    }
  }

  return clone;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
