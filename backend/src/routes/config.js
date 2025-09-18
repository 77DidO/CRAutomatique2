import { Router } from 'express';
import { getConfigHandler, updateConfigHandler } from '../controllers/configController.js';

const router = Router();

router.get('/', getConfigHandler);
router.put('/', updateConfigHandler);

export default router;
