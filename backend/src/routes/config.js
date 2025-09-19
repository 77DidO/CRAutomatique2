import express from 'express';

export function createConfigRouter({ configStore }) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const config = await configStore.get();
      res.json(config);
    } catch (error) {
      next(error);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      const payload = req.body ?? {};
      const nextConfig = await configStore.merge(payload);
      res.json(nextConfig);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
