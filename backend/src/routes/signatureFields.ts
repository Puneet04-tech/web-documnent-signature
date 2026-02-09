import { Router } from 'express';
import { signatureFieldController, signatureFieldValidation } from '../controllers/signatureFieldController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all fields for a document
router.get('/document/:docId', authMiddleware, signatureFieldController.getByDocument);

// Create a new field
router.post('/', authMiddleware, signatureFieldValidation.create, signatureFieldController.create);

// Update a field
router.put('/:id', authMiddleware, signatureFieldController.update);

// Delete a field
router.delete('/:id', authMiddleware, signatureFieldController.delete);

// Fill a field
router.post('/fill', authMiddleware, signatureFieldValidation.fill, signatureFieldController.fill);

// Link fields across pages
router.post('/link', authMiddleware, signatureFieldController.linkField);

// Create from template
router.post('/template', authMiddleware, signatureFieldController.createFromTemplate);

export default router;
