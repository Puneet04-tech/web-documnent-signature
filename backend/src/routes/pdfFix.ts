import { Router } from 'express';
import { pdfFixController } from '../controllers/pdfFixController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Find and serve PDF by document ID (authenticated)
router.get('/document/:documentId', authMiddleware, pdfFixController.findAndServePdf);

// Find and serve PDF by document ID (public for signing portal)
router.get('/public/:documentId', pdfFixController.findAndServePdfPublic);

export default router;
