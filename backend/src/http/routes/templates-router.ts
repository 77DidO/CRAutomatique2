import { Router, type NextFunction, type Request, type Response } from 'express';
import { createHttpError } from '../../utils/http-error.js';
import type { TemplateInput, TemplateStore } from '../../types/index.js';

interface CreateTemplatesRouterOptions {
  templateStore: TemplateStore;
}

export function createTemplatesRouter({ templateStore }: CreateTemplatesRouterOptions): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await templateStore.list();
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await templateStore.create(req.body as TemplateInput);
      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        throw createHttpError(400, 'Template id is required');
      }
      const template = await templateStore.update(req.params.id, req.body as TemplateInput);
      res.json(template);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        throw createHttpError(400, 'Template id is required');
      }
      await templateStore.remove(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
