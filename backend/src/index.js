import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

import itemsRoutes from './routes/items.js';
import configRoutes from './routes/config.js';
import templatesRoutes from './routes/templates.js';
import { initJobWatcher } from './services/watcher.js';
import { ensureDataDirectories } from './utils/fileSystem.js';
import { loadConfig } from './services/configService.js';
import { info, error as logError } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 4000;
const DATA_DIR = path.join(process.cwd(), 'backend', 'data', 'jobs');

ensureDataDirectories();
info('Répertoires de données vérifiés.');
loadConfig();
info('Configuration initiale chargée.');

const routes = [];

function normalizeBase(basePath) {
  if (!basePath) {
    return '';
  }
  if (basePath === '/') {
    return '';
  }
  return basePath.replace(/\/+$/, '');
}

function normalizeSubPath(subPath) {
  if (!subPath || subPath === '/') {
    return '';
  }
  return subPath.replace(/^\/+/, '');
}

function buildRoute(basePath, route) {
  const normalizedBase = normalizeBase(basePath);
  const normalizedSub = normalizeSubPath(route.path);
  const fullPath = `${normalizedBase}/${normalizedSub}`.replace(/\/+/, '/');
  const finalPath = fullPath === '/' ? '/' : fullPath.replace(/\/+$/, '').replace(/^$/, '/');
  const paramNames = [];
  const regexPattern = finalPath
    .replace(/\//g, '\\/')
    .replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  const regex = new RegExp(`^${regexPattern}/?$`);
  routes.push({
    method: route.method.toUpperCase(),
    regex,
    paramNames,
    handler: route.handler,
    options: route.options || {}
  });
}

function registerRoutes(basePath, routeDefinitions) {
  routeDefinitions.forEach((route) => buildRoute(basePath, route));
}

registerRoutes('/api/items', itemsRoutes);
registerRoutes('/api/config', configRoutes);
registerRoutes('/api/templates', templatesRoutes);

function buildResponse(res) {
  let statusCode = 200;
  return {
    status(code) {
      statusCode = code;
      res.statusCode = code;
      return this;
    },
    json(payload) {
      const data = JSON.stringify(payload);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.statusCode = statusCode;
      res.end(data);
    },
    send(payload) {
      res.statusCode = statusCode;
      if (Buffer.isBuffer(payload)) {
        res.end(payload);
        return;
      }
      if (typeof payload === 'string') {
        res.end(payload);
        return;
      }
      if (payload === undefined || payload === null) {
        res.end();
        return;
      }
      const data = String(payload);
      res.end(data);
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    }
  };
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function matchRoute(method, pathname) {
  return routes.find((route) => route.method === method && route.regex.test(pathname));
}

function extractParams(route, pathname) {
  const match = pathname.match(route.regex);
  if (!match) {
    return {};
  }
  const params = {};
  route.paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1]);
  });
  return params;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseUrlEncoded(bodyBuffer) {
  const decoded = new URLSearchParams(bodyBuffer.toString('utf-8'));
  const result = {};
  for (const [key, value] of decoded.entries()) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function parseMultipart(bodyBuffer, boundary) {
  const boundaryMarker = `--${boundary}`;
  const parts = bodyBuffer.toString('binary').split(boundaryMarker).slice(1, -1);
  const fields = {};
  let file = null;
  await fs.promises.mkdir(path.join(process.cwd(), 'backend', 'data', 'uploads'), { recursive: true });

  parts.forEach((part) => {
    const trimmed = part.startsWith('\r\n') ? part.slice(2) : part;
    const [rawHeaders, rawValue] = trimmed.split('\r\n\r\n');
    if (!rawHeaders) {
      return;
    }
    const valueBinary = rawValue?.slice(0, -2) ?? '';
    const headers = rawHeaders.split('\r\n');
    const disposition = headers.find((header) => header.toLowerCase().startsWith('content-disposition')) || '';
    const nameMatch = disposition.match(/name="([^"]+)"/i);
    const filenameMatch = disposition.match(/filename="([^"]*)"/i);
    const contentTypeHeader = headers.find((header) => header.toLowerCase().startsWith('content-type'));
    const contentType = contentTypeHeader ? contentTypeHeader.split(':')[1].trim() : 'application/octet-stream';
    if (filenameMatch && filenameMatch[1]) {
      const originalname = filenameMatch[1];
      const safeName = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;
      const storedPath = path.join(process.cwd(), 'backend', 'data', 'uploads', safeName);
      const buffer = Buffer.from(valueBinary, 'binary');
      fs.writeFileSync(storedPath, buffer);
      file = {
        path: storedPath,
        originalname,
        mimetype: contentType,
        size: buffer.length
      };
    } else if (nameMatch && nameMatch[1]) {
      const key = nameMatch[1];
      fields[key] = Buffer.from(valueBinary || '', 'binary').toString('utf-8');
    }
  });

  return { body: fields, file };
}

async function parseRequest(req, route, urlDetails) {
  const method = req.method || 'GET';
  const bodyInfo = { body: {}, file: null };
  if (method === 'GET' || method === 'HEAD') {
    return bodyInfo;
  }
  const contentType = req.headers['content-type'] || '';
  const bodyBuffer = await readRequestBody(req);
  if (!contentType) {
    return bodyInfo;
  }
  if (contentType.startsWith('application/json')) {
    try {
      bodyInfo.body = bodyBuffer.length ? JSON.parse(bodyBuffer.toString('utf-8')) : {};
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
    return bodyInfo;
  }
  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    bodyInfo.body = parseUrlEncoded(bodyBuffer);
    return bodyInfo;
  }
  if (contentType.startsWith('multipart/form-data')) {
    if (!route.options?.expectsUpload) {
      return bodyInfo;
    }
    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
    if (!boundaryMatch) {
      throw new Error('Multipart payload missing boundary');
    }
    return parseMultipart(bodyBuffer, boundaryMatch[1]);
  }
  return bodyInfo;
}

function buildRequest(req, urlDetails, params, body, file) {
  const request = Object.create(req);
  request.params = params;
  request.query = Object.fromEntries(urlDetails.searchParams.entries());
  request.body = body || {};
  if (file) {
    request.file = file;
    request.files = [file];
  }
  return request;
}

function handleNotFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
}

function handleStaticAsset(pathname, res) {
  const assetPath = pathname.slice('/api/assets/'.length);
  const decodedPath = decodeURIComponent(assetPath);
  const fullPath = path.join(DATA_DIR, decodedPath);
  const safeBase = path.normalize(DATA_DIR);
  const normalizedFullPath = path.normalize(fullPath);
  if (!normalizedFullPath.startsWith(safeBase)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return true;
  }
  if (!fs.existsSync(normalizedFullPath) || fs.statSync(normalizedFullPath).isDirectory()) {
    return false;
  }
  const stream = fs.createReadStream(normalizedFullPath);
  stream.on('error', () => {
    res.statusCode = 500;
    res.end('Internal server error');
  });
  stream.pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  applyCors(res);
  if ((req.method || 'GET').toUpperCase() === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const urlDetails = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlDetails.pathname;

  if (pathname.startsWith('/api/assets/')) {
    const served = handleStaticAsset(pathname, res);
    if (served) {
      return;
    }
  }

  const method = (req.method || 'GET').toUpperCase();
  const route = matchRoute(method, pathname);
  if (!route) {
    handleNotFound(res);
    return;
  }

  const params = extractParams(route, pathname);
  let parsedBody;
  try {
    parsedBody = await parseRequest(req, route, urlDetails);
  } catch (error) {
    logError('Erreur de parsing de requête', { message: error.message });
    const response = buildResponse(res);
    response.status(400).json({ error: error.message });
    return;
  }
  const request = buildRequest(req, urlDetails, params, parsedBody.body, parsedBody.file);
  const response = buildResponse(res);

  try {
    await route.handler(request, response);
    if (!res.writableEnded) {
      res.end();
    }
  } catch (error) {
    logError('Erreur non interceptée', { message: error.message, stack: error.stack });
    if (!res.writableEnded) {
      response.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
});

server.listen(PORT, () => {
  info(`API server running on port ${PORT}`);
});

info('Initialisation du watcher de jobs.');
initJobWatcher();
