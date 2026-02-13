import { Router } from 'express';
import { templateController } from '../controllers/templateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, templateController.create);
router.get('/', authMiddleware, templateController.list);
router.get('/:id', authMiddleware, templateController.get);
router.post('/:id/use', authMiddleware, templateController.use);

export default router;
