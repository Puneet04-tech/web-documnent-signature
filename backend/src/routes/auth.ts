import { Router } from 'express';
import { authController, registerValidation, loginValidation } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authMiddleware, authController.me);

export default router;
