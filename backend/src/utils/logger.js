// Minimal structured logger (JSON-like) to standardise console output and
// simplify debugging across steps.
const LEVELS = ['debug', 'info', 'warn', 'error'];

function resolveLevelIndex(level) {
  const normalized = typeof level === 'string' ? level.toLowerCase() : '';
  const index = LEVELS.indexOf(normalized);
  return index === -1 ? LEVELS.indexOf('info') : index;
}

function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

function serializeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }

  try {
    return JSON.stringify(metadata);
  } catch (error) {
    return JSON.stringify({ serializationError: error?.message ?? 'Unknown error' });
  }
}

export function createLogger(context = {}) {
  const baseLevel = process.env.LOG_LEVEL ?? 'info';
  const threshold = resolveLevelIndex(baseLevel);

  function log(level, message, metadata) {
    const levelIndex = resolveLevelIndex(level);
    if (levelIndex < threshold) {
      return;
    }

    const payload = {
      timestamp: formatTimestamp(),
      level: LEVELS[levelIndex] ?? level,
      ...context
    };

    if (typeof message === 'string' && message.trim().length > 0) {
      payload.message = message;
    }

    if (metadata && typeof metadata === 'object') {
      payload.metadata = metadata;
    }

    const serializedMetadata = serializeMetadata(payload.metadata);
    const base = `[${payload.level.toUpperCase()}] ${payload.timestamp}`;
    const scope = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    const finalMessage = scope ? `${base} ${scope} ${payload.message ?? ''}`.trim() : `${base} ${payload.message ?? ''}`.trim();

    const method = levelIndex >= resolveLevelIndex('error')
      ? console.error
      : levelIndex >= resolveLevelIndex('warn')
        ? console.warn
        : console.log;

    if (serializedMetadata) {
      method.call(console, `${finalMessage} ${serializedMetadata}`);
    } else {
      method.call(console, finalMessage);
    }
  }

  const api = {
    debug(message, metadata) {
      log('debug', message, metadata);
    },
    info(message, metadata) {
      log('info', message, metadata);
    },
    warn(message, metadata) {
      log('warn', message, metadata);
    },
    error(message, metadata) {
      log('error', message, metadata);
    },
    child(additionalContext = {}) {
      return createLogger({ ...context, ...additionalContext });
    }
  };

  return api;
}

export const logger = createLogger({ scope: 'backend' });
