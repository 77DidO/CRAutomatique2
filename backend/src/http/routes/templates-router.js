import { Router } from 'express';
import { createHttpError } from '../../utils/http-error.js';

export function createTemplatesRouter({ templateStore }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const templates = await templateStore.list();
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const template = await templateStore.create(req.body);
      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const template = await templateStore.update(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await templateStore.remove(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
