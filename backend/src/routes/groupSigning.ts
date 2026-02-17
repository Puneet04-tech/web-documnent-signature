import express from 'express';
import {
  createSigningGroup,
  getSigningGroups,
  addGroupMember,
  removeGroupMember,
  createGroupSigningRequest,
  getGroupSigningRequests,
  createGroupValidation
} from '../controllers/groupSigningController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Group management routes
router.post('/', authMiddleware, createGroupValidation, createSigningGroup);
router.get('/', authMiddleware, getSigningGroups);
router.post('/:groupId/members', authMiddleware, addGroupMember);
router.delete('/:groupId/members/:memberId', authMiddleware, removeGroupMember);

// Group signing routes
router.post('/:groupId/signing-requests', authMiddleware, createGroupSigningRequest);
router.get('/:groupId/signing-requests', authMiddleware, getGroupSigningRequests);

export default router;
