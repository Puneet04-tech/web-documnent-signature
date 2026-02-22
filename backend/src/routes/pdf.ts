import { Router } from 'express';
import { pdfController } from '../controllers/pdfController';
import { authMiddleware } from '../middleware/auth';
import { migrateExistingDocuments } from '../scripts/migrateDocuments';

const router = Router();

// Authenticated PDF serving routes
router.get('/document/:documentId', authMiddleware, pdfController.servePdfFromMongo);
router.get('/signed/:documentId', authMiddleware, pdfController.serveSignedPdfFromMongo);

// Public PDF serving (for signing portal)
router.get('/public/:documentId', pdfController.servePublicPdfFromMongo);

// Temporary migration route (remove after use)
router.post('/migrate', async (req, res) => {
  try {
    await migrateExistingDocuments();
    res.json({ success: true, message: 'Migration completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Migration failed' });
  }
});

export default router;
