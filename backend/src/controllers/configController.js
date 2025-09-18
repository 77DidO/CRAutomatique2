import { getConfig, saveConfig } from '../services/configService.js';

export function getConfigHandler(_req, res) {
  res.json(getConfig());
}

export function updateConfigHandler(req, res) {
  const config = saveConfig(req.body || {});
  res.json(config);
}
