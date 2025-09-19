import express from 'express';

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function validateTemplatePayload(payload, { partial = false } = {}) {
  const name = payload?.name ?? '';
  const prompt = payload?.prompt ?? '';

  if (!partial || 'name' in payload) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new HttpError(400, 'Le nom du gabarit est obligatoire.');
    }
  }

  if (!partial || 'prompt' in payload) {
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new HttpError(400, 'Le prompt du gabarit est obligatoire.');
    }
  }

  if ('description' in payload && typeof payload.description !== 'string') {
    throw new HttpError(400, 'La description du gabarit doit être une chaîne de caractères.');
  }
}

export function createTemplatesRouter({ templateStore }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(templateStore.all());
  });

  router.post('/', async (req, res, next) => {
    try {
      validateTemplatePayload(req.body ?? {});
      const created = await templateStore.create(req.body ?? {});
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      validateTemplatePayload(req.body ?? {}, { partial: true });
      const updated = await templateStore.update(req.params.id, req.body ?? {});
      if (!updated) {
        throw new HttpError(404, 'Gabarit introuvable.');
      }
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      if (req.params.id === 'default') {
        throw new HttpError(400, 'Le gabarit par défaut ne peut pas être supprimé.');
      }
      const deleted = await templateStore.delete(req.params.id);
      if (!deleted) {
        throw new HttpError(404, 'Gabarit introuvable.');
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
