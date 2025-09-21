export function maskSecrets(config) {
  const clone = {
    ...config,
    whisper: config.whisper ? { ...config.whisper } : undefined,
    llm: config.llm ? { ...config.llm } : {},
    pipeline: config.pipeline ? { ...config.pipeline } : undefined,
  };

  if (clone.llm) {
    const value = clone.llm.apiKey;
    clone.llm.hasApiKey = typeof value === 'string' && value.length > 0;
    delete clone.llm.apiKey;
  }

  return clone;
}

export function sanitisePayload(payload) {
  const clone = typeof structuredClone === 'function'
    ? structuredClone(payload)
    : JSON.parse(JSON.stringify(payload));

  if (!clone.llm) {
    return clone;
  }

  if ('hasApiKey' in clone.llm) {
    delete clone.llm.hasApiKey;
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
