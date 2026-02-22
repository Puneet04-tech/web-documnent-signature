import { Router } from 'express';
import { pdfController } from '../controllers/pdfController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Authenticated PDF serving routes
router.get('/document/:documentId', authMiddleware, pdfController.servePdfFromMongo);
router.get('/signed/:documentId', authMiddleware, pdfController.serveSignedPdfFromMongo);

// Public PDF serving (for signing portal)
router.get('/public/:documentId', pdfController.servePublicPdfFromMongo);

export default router;
