import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/:docId', authMiddleware, auditController.getByDocument);

export default router;
