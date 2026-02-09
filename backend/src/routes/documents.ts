import { Router } from 'express';
import { documentController } from '../controllers/documentController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/upload', authMiddleware, upload.single('file'), documentController.upload);
router.get('/', authMiddleware, documentController.list);
router.get('/:id', authMiddleware, documentController.get);
router.get('/:id/download', authMiddleware, documentController.download);
router.delete('/:id', authMiddleware, documentController.delete);

export default router;
