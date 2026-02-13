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

// Document recipient routes (for document recipients) - MUST come before public routes
router.get('/sign-document/:documentId/:email', documentRecipientController.getPublicDocumentSigning);
router.post('/sign-document/:documentId/:email/sign', documentRecipientController.signDocumentByRecipient);
router.get('/sign-document/:documentId/:email/download', documentRecipientController.downloadSignedDocument);

// Public routes (for external signers) - MUST come after document recipient routes
router.get('/public/:token', optionalAuthMiddleware, signingRequestController.getByToken);
router.post('/public/:token/sign', optionalAuthMiddleware, signingRequestController.signByToken);

export default router;
