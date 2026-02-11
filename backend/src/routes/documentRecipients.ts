import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getDocumentRecipients,
  addDocumentRecipients,
  updateRecipientStatus,
  deleteRecipient
} from '../controllers/documentRecipientController';

const router = Router();

// Get all recipients for a document
router.get('/documents/:documentId/recipients', authMiddleware, getDocumentRecipients);

// Add recipients to a document
router.post('/documents/:documentId/recipients', authMiddleware, addDocumentRecipients);

// Update recipient status
router.put('/recipients/:recipientId/status', updateRecipientStatus);

// Delete recipient
router.delete('/recipients/:recipientId', authMiddleware, deleteRecipient);

export default router;
