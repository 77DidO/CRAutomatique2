import { getConfigHandler, updateConfigHandler } from '../controllers/configController.js';

export default [
  { method: 'GET', path: '/', handler: getConfigHandler },
  { method: 'POST', path: '/', handler: updateConfigHandler }
];
