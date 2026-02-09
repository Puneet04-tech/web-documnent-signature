import { Router } from 'express';
import { finalizeController } from '../controllers/finalizeController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Finalize document and generate signed PDF
router.post('/:id/finalize', authMiddleware, finalizeController.finalize);

// Preview signed PDF (without saving)
router.get('/:id/preview', authMiddleware, finalizeController.preview);

export default router;
