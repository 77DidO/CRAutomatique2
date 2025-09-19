import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import itemsRouter from './routes/items.js';
import configRouter from './routes/config.js';
import templatesRouter from './routes/templates.js';
import { initJobWatcher } from './services/watcher.js';
import { ensureDataDirectories, getJobsDir } from './utils/fileSystem.js';
import { loadConfig } from './services/configService.js';
import { info, error as logError } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 4000;

ensureDataDirectories();
loadConfig();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/items', itemsRouter);
app.use('/api/config', configRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/assets', express.static(getJobsDir()));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logError('Unhandled error', { message: err.message, stack: err.stack });
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
  info(`API server running on port ${PORT}`);
});

info('Initialisation du watcher de jobs.');
initJobWatcher();
