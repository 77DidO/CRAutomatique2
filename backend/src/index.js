import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import itemsRouter from './routes/items.js';
import configRouter from './routes/config.js';
import templatesRouter from './routes/templates.js';
import { initJobWatcher } from './services/watcher.js';
import { ensureDataDirectories } from './utils/fileSystem.js';
import { loadConfig } from './services/configService.js';
import { info, error as logError } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

ensureDataDirectories();
info('Répertoires de données vérifiés.');
loadConfig();
info('Configuration initiale chargée.');

app.use('/api/items', itemsRouter);
app.use('/api/config', configRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/assets', express.static(path.join(__dirname, '../data/jobs')));

app.get('/health', (_req, res) => {
  info('Requête de vérification de santé reçue.');
  res.json({ status: 'ok' });
});

app.use((err, _req, res, _next) => {
  logError('Erreur non interceptée', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
  info(`API server running on port ${PORT}`);
});

info('Initialisation du watcher de jobs.');
initJobWatcher();
