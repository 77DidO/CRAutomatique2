import express from 'express';
import { access } from 'fs/promises';
import path from 'path';
import { jobAssetPath } from '../config/paths.js';

export function createAssetsRouter({ jobStore }) {
  const router = express.Router();

  router.get('/:jobId/:filename', async (req, res, next) => {
    try {
      const { jobId, filename } = req.params;
      const job = jobStore.get(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job introuvable.' });
      }

      const safeName = path.basename(filename);
      if (safeName !== filename) {
        return res.status(400).json({ error: 'Nom de fichier invalide.' });
      }

      const assetPath = jobAssetPath(jobId, safeName);
      await access(assetPath);
      res.sendFile(assetPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Fichier introuvable.' });
      }
      next(error);
    }
  });

  return router;
}
