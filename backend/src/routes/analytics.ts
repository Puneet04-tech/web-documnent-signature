import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Document analytics routes
router.get('/document/:documentId', authMiddleware, analyticsController.getDocumentAnalytics);
router.get('/user/:userId', authMiddleware, analyticsController.getUserAnalytics);

// Legacy route for backward compatibility
router.get('/:documentId', authMiddleware, analyticsController.getDocumentAnalytics);

export default router;
