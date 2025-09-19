import { info } from '../utils/logger.js';
import { REPORT_TEMPLATE_OPTIONS } from '../constants/templates.js';

export function listTemplates(_req, res) {
  info('Requête de récupération des templates reçue.');
  res.json(REPORT_TEMPLATE_OPTIONS);
}

export { REPORT_TEMPLATE_OPTIONS };
