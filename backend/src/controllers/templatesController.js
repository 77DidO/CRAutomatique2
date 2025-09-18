const REPORT_TEMPLATE_OPTIONS = [
  { id: 'meeting-notes', label: 'Notes de réunion' },
  { id: 'interview', label: 'Interview' },
  { id: 'workshop', label: 'Atelier collaboratif' }
];

export function listTemplates(_req, res) {
  res.json(REPORT_TEMPLATE_OPTIONS);
}

export { REPORT_TEMPLATE_OPTIONS };
