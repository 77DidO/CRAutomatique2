import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import {
  listItems,
  getItem,
  createItem,
  getItemLogs,
  deleteItem
} from '../controllers/itemsController.js';

const uploadDirectory = path.join(process.cwd(), 'backend', 'data', 'uploads');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage });

const router = Router();

router.get('/', listItems);
router.get('/:id', getItem);
router.get('/:id/logs', getItemLogs);
router.post('/', upload.single('file'), createItem);
router.delete('/:id', deleteItem);

export default router;
