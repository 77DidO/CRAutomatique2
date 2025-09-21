import type { LogLevel, Logger } from '../types/index.js';

export function createLogger(): Logger {
  return {
    info(payload: unknown, message?: string) {
      logWithLevel('info', payload, message);
    },
    error(payload: unknown, message?: string) {
      logWithLevel('error', payload, message);
    },
    warn(payload: unknown, message?: string) {
      logWithLevel('warn', payload, message);
    },
    debug(payload: unknown, message?: string) {
      if (process.env.LOG_LEVEL === 'debug') {
        logWithLevel('debug', payload, message);
      }
    },
  };
}

function logWithLevel(level: LogLevel, payload: unknown, message?: string): void {
  const time = new Date().toISOString();
  const entry: Record<string, unknown> = { level, time };
  if (typeof message === 'undefined' && typeof payload === 'string') {
    entry.message = payload;
  } else {
    entry.message = message ?? '';
    if (typeof payload !== 'undefined') {
      entry.payload = payload;
    }
  }
  console.log(JSON.stringify(entry));
}
