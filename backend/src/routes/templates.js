import { Router } from 'express';
import { listTemplates, updateTemplates } from '../controllers/templatesController.js';

const router = Router();

router.get('/', listTemplates);
router.put('/', updateTemplates);

export default router;
