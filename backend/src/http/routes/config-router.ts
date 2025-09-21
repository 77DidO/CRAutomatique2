import { Router, type NextFunction, type Request, type Response } from 'express';
import { createHttpError } from '../../utils/http-error.js';
import { maskSecrets, sanitisePayload } from './config-router.helpers.js';
import type { AppConfig, ConfigStore, DeepPartial } from '../../types/index.js';

interface CreateConfigRouterOptions {
  configStore: ConfigStore;
}

export function createConfigRouter({ configStore }: CreateConfigRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await configStore.read();
      res.json(maskSecrets(config));
    } catch (error) {
      next(error);
    }
  });

  router.put('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as unknown;
      if (typeof body !== 'object' || body === null) {
        throw createHttpError(400, 'Invalid configuration payload');
      }

      const sanitised = sanitisePayload(body as DeepPartial<AppConfig>);
      const updated = await configStore.write(sanitised);
      res.json(maskSecrets(updated));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
