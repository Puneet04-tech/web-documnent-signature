import { Router } from 'express';
import { signatureController, signatureValidation } from '../controllers/signatureController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, signatureValidation, signatureController.create);
router.get('/:docId', authMiddleware, signatureController.getByDocument);
router.delete('/:id', authMiddleware, signatureController.remove);
router.post('/finalize', authMiddleware, signatureController.finalize);

export default router;
