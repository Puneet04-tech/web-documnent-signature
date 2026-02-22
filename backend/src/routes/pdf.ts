import { Router } from 'express';
import { pdfController } from '../controllers/pdfController';
import { authMiddleware } from '../middleware/auth';
import { migrateExistingDocuments } from '../scripts/migrateDocuments';
import { Document } from '../models';

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

// Debug endpoint to check document content
router.get('/debug/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    res.json({
      success: true,
      data: {
        _id: document._id,
        title: document.title,
        originalName: document.originalName,
        filePath: document.filePath,
        hasPdfContent: !!document.pdfContent,
        pdfContentLength: document.pdfContent?.length || 0,
        fileSize: document.fileSize
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Debug failed', error: error.message });
  }
});

export default router;
