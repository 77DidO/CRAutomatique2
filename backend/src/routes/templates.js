import express from 'express';

export function createTemplatesRouter({ templateStore }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(templateStore.all());
  });

  return router;
}
