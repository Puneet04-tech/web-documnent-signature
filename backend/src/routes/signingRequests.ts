import { Router } from 'express';
import { signingRequestController, signingRequestValidation } from '../controllers/signingRequestController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/', authMiddleware, signingRequestValidation, signingRequestController.create);
router.get('/', authMiddleware, signingRequestController.list);
router.post('/:id/resend', authMiddleware, signingRequestController.resend);
router.post('/:id/cancel', authMiddleware, signingRequestController.cancel);

// Public routes (for external signers)
router.get('/public/:token', optionalAuthMiddleware, signingRequestController.getByToken);
router.post('/public/:token/sign', optionalAuthMiddleware, signingRequestController.signByToken);

export default router;
