import { Router } from 'express';
import { pdfFixController } from '../controllers/pdfFixController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Find and serve PDF by document ID
router.get('/document/:documentId', authMiddleware, pdfFixController.findAndServePdf);

export default router;
