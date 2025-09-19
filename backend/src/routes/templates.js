import { listTemplates, updateTemplates } from '../controllers/templatesController.js';

export default [
  { method: 'GET', path: '/', handler: listTemplates },
  { method: 'POST', path: '/', handler: updateTemplates }
];
