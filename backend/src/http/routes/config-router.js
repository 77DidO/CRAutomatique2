import { Router } from 'express';
import { createHttpError } from '../../utils/http-error.js';
import { maskSecrets, sanitisePayload } from './config-router.helpers.js';

export function createConfigRouter({ configStore }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const config = await configStore.read();
      res.json(maskSecrets(config));
    } catch (error) {
      next(error);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      if (typeof req.body !== 'object' || req.body === null) {
        throw createHttpError(400, 'Invalid configuration payload');
      }

      const sanitised = sanitisePayload(req.body);
      const updated = await configStore.write(sanitised);
      res.json(maskSecrets(updated));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
