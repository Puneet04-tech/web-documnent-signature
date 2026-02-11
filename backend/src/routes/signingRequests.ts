import { Router } from 'express';
import { signingRequestController, signingRequestValidation } from '../controllers/signingRequestController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import * as documentRecipientController from '../controllers/documentRecipientController';

const router = Router();

// Protected routes
router.post('/', authMiddleware, signingRequestValidation, signingRequestController.create);
router.get('/', authMiddleware, signingRequestController.list);
router.post('/:id/resend', authMiddleware, signingRequestController.resend);
router.post('/:id/cancel', authMiddleware, signingRequestController.cancel);

// Public routes (for external signers)
router.get('/public/:token', optionalAuthMiddleware, signingRequestController.getByToken);
router.post('/public/:token/sign', optionalAuthMiddleware, signingRequestController.signByToken);

// Document recipient routes (for document recipients)
router.get('/document/:documentId/:email', documentRecipientController.getPublicDocumentSigning);
router.post('/document/:documentId/:email/sign', documentRecipientController.signDocumentByRecipient);

export default router;
