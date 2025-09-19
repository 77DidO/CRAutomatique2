import {
  listItems,
  getItem,
  createItem,
  getItemLogs,
  deleteItem
} from '../controllers/itemsController.js';

export default [
  { method: 'GET', path: '/', handler: listItems },
  { method: 'GET', path: '/:id', handler: getItem },
  { method: 'GET', path: '/:id/logs', handler: getItemLogs },
  { method: 'POST', path: '/', handler: createItem, options: { expectsUpload: true } },
  { method: 'DELETE', path: '/:id', handler: deleteItem }
];
