import { Router } from 'express';
import { listTemplates } from '../controllers/templatesController.js';

const router = Router();

router.get('/', listTemplates);

export default router;
