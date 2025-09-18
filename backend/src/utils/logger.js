const LEVELS = ['error', 'warn', 'info', 'debug'];
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const levelIndex = LEVELS.indexOf(LOG_LEVEL);

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  if (meta && Object.keys(meta).length > 0) {
    return `${timestamp} [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`;
  }
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
}

function log(level, message, meta) {
  if (levelIndex !== -1 && LEVELS.indexOf(level) > levelIndex) {
    return;
  }
  const formatted = formatMessage(level, message, meta);
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export function info(message, meta) {
  log('info', message, meta);
}

export function warn(message, meta) {
  log('warn', message, meta);
}

export function error(message, meta) {
  log('error', message, meta);
}

export function debug(message, meta) {
  log('debug', message, meta);
}
