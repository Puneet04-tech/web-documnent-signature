import { Router } from 'express';
import { pdfContentController } from '../controllers/pdfContentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Upload PDF content to MongoDB
router.post('/upload/:documentId', authMiddleware, pdfContentController.uploadPdfContent);

export default router;
