import { info } from '../utils/logger.js';

const REPORT_TEMPLATE_OPTIONS = [
  { id: 'meeting-notes', label: 'Notes de réunion' },
  { id: 'interview', label: 'Interview' },
  { id: 'workshop', label: 'Atelier collaboratif' },
  { id: 'qa-report', label: 'CR Question réponse' }
];

export function listTemplates(_req, res) {
  info('Requête de récupération des templates reçue.');
  res.json(REPORT_TEMPLATE_OPTIONS);
}

export { REPORT_TEMPLATE_OPTIONS };
