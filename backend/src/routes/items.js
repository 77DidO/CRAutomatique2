import { Router } from 'express';
import {
  listItems,
  getItem,
  createItem,
  getItemLogs,
  deleteItem
} from '../controllers/itemsController.js';
import { uploadMiddleware } from '../services/watcher.js';

const router = Router();

router.get('/', listItems);
router.get('/:id', getItem);
router.get('/:id/logs', getItemLogs);
router.post('/', uploadMiddleware.single('file'), createItem);
router.delete('/:id', deleteItem);

export default router;
