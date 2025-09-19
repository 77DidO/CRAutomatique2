import { info, warn, error as logError } from '../utils/logger.js';
import { getConfig, saveConfig } from '../services/configService.js';

export function listTemplates(_req, res) {
  info('Requête de récupération des templates reçue.');
  const { templates } = getConfig();
  res.json(templates);
}

export async function updateTemplates(req, res) {
  info('Requête de mise à jour des templates reçue.');
  const { templates } = req.body || {};

  if (!Array.isArray(templates)) {
    warn('Mise à jour des templates rejetée : payload invalide.');
    return res.status(400).json({ error: 'Le payload doit contenir un tableau "templates".' });
  }

  try {
    const config = saveConfig({ templates });
    res.json(config.templates);
  } catch (error) {
    logError('Échec de la sauvegarde des templates.', { message: error.message });
    res.status(500).json({ error: 'Impossible de sauvegarder les templates.' });
  }
}
