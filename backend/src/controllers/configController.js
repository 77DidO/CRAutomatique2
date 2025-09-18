import { getConfig, saveConfig } from '../services/configService.js';
import { info } from '../utils/logger.js';

export function getConfigHandler(_req, res) {
  info('Requête de récupération de la configuration reçue.');
  res.json(getConfig());
}

export function updateConfigHandler(req, res) {
  info('Requête de mise à jour de la configuration reçue.');
  const config = saveConfig(req.body || {});
  res.json(config);
}
