import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { createAssetsRouter } from './routes/assets.js';
import { createConfigRouter } from './routes/config.js';
import { createItemsRouter } from './routes/items.js';
import { createTemplatesRouter } from './routes/templates.js';

export function createApp({ jobStore, configStore, templateStore }) {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/items', createItemsRouter({ jobStore, templateStore, configStore }));
  app.use('/api/config', createConfigRouter({ configStore }));
  app.use('/api/templates', createTemplatesRouter({ templateStore }));
  app.use('/api/assets', createAssetsRouter({ jobStore }));

  app.use((req, res) => {
    res.status(404).json({ error: 'Route introuvable.' });
  });

  app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(error);
    const status = error.statusCode ?? error.status ?? 500;
    res.status(status).json({ error: error.message ?? 'Erreur interne du serveur.' });
  });

  return app;
}
