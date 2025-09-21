import { Router } from 'express';
import { createHttpError } from '../../utils/http-error.js';

export function createConfigRouter({ configStore }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const config = await configStore.read();
      res.json(config);
    } catch (error) {
      next(error);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      if (typeof req.body !== 'object' || req.body === null) {
        throw createHttpError(400, 'Invalid configuration payload');
      }

      const updated = await configStore.write(req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
