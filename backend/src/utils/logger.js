export function createLogger() {
  return {
    info(payload, message) {
      logWithLevel('info', payload, message);
    },
    error(payload, message) {
      logWithLevel('error', payload, message);
    },
    warn(payload, message) {
      logWithLevel('warn', payload, message);
    },
    debug(payload, message) {
      if (process.env.LOG_LEVEL === 'debug') {
        logWithLevel('debug', payload, message);
      }
    },
  };
}

function logWithLevel(level, payload, message) {
  const time = new Date().toISOString();
  const entry = { level, time };
  if (typeof message === 'undefined' && typeof payload === 'string') {
    entry.message = payload;
  } else {
    entry.message = message || '';
    if (payload) {
      entry.payload = payload;
    }
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}
