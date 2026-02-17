import { Response } from 'express';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { SigningGroup, Document, SigningRequest, User } from '../models';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';
import { sendSigningRequestEmail } from '../services/emailService';

export const createGroupValidation = [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean')
];

export const createSigningGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, isPublic = false } = req.body;
  const userId = req.user!._id;

  // Create group with owner as first member (leader)
  const group = await SigningGroup.create({
    name,
    description,
    owner: userId,
    members: [{
      userId,
      email: req.user!.email,
      name: req.user!.name,
      role: 'leader',
      joinedAt: new Date(),
      status: 'active'
    }],
    isPublic,
    inviteCode: isPublic ? uuidv4().substring(0, 8).toUpperCase() : undefined
  });

  await createAuditLog({
    user: userId,
    signingGroup: group._id.toString(),
    action: 'group_created',
    ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    details: { groupName: name, isPublic }
  });

  res.status(201).json({
    success: true,
    message: 'Signing group created successfully',
    data: group
  });
});

export const getSigningGroups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { page = 1, limit = 10, search } = req.query;

  const query: any = {
    $or: [
      { owner: userId },
      { 'members.userId': userId }
    ]
  };

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const groups = await SigningGroup.find(query)
    .populate('owner', 'name email')
    .populate('members.userId', 'name email')
    .limit(Number(limit) * Number(page))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });

  const total = await SigningGroup.countDocuments(query);

  res.json({
    success: true,
    data: groups,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

export const addGroupMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const { email, name, role = 'member' } = req.body;
  const userId = req.user!._id;

  const group = await SigningGroup.findOne({
    _id: groupId,
    $or: [
      { owner: userId },
      { 'members.userId': userId, 'members.role': 'leader' }
    ]
  });

  if (!group) {
    throw new AppError('Group not found or insufficient permissions', 404);
  }

  // Check if user exists
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('User not found with this email', 404);
  }

  // Check if already a member
  const existingMember = group.members.find(
    member => member.email.toLowerCase() === email.toLowerCase()
  );

  if (existingMember) {
    throw new AppError('User is already a member of this group', 400);
  }

  group.members.push({
    userId: user._id,
    email: user.email,
    name: name || user.name,
    role,
    joinedAt: new Date(),
    status: 'active'
  });

  await group.save();

  await createAuditLog({
    user: userId,
    signingGroup: groupId,
    action: 'member_added',
    ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    details: { addedMemberEmail: email, role }
  });

  res.json({
    success: true,
    message: 'Member added successfully',
    data: group
  });
});

export const removeGroupMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId, memberId } = req.params;
  const userId = req.user!._id;

  const group = await SigningGroup.findOne({
    _id: groupId,
    $or: [
      { owner: userId },
      { 'members.userId': userId, 'members.role': 'leader' }
    ]
  });

  if (!group) {
    throw new AppError('Group not found or insufficient permissions', 404);
  }

  // Cannot remove the owner/leader
  const memberToRemove = group.members.id(memberId);
  if (!memberToRemove) {
    throw new AppError('Member not found', 404);
  }

  if (memberToRemove.role === 'leader') {
    throw new AppError('Cannot remove group leader', 400);
  }

  group.members.pull(memberId);
  await group.save();

  await createAuditLog({
    user: userId,
    signingGroup: groupId,
    action: 'member_removed',
    ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    details: { removedMemberEmail: memberToRemove.email }
  });

  res.json({
    success: true,
    message: 'Member removed successfully',
    data: group
  });
});

export const createGroupSigningRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId, documentId, message, subject, signingOrder = 'parallel', expiresInDays } = req.body;
  const userId = req.user!._id;

  // Verify group exists and user is a leader
  const group = await SigningGroup.findOne({
    _id: groupId,
    $or: [
      { owner: userId },
      { 'members.userId': userId, 'members.role': 'leader' }
    ]
  }).populate('members.userId');

  if (!group) {
    throw new AppError('Group not found or insufficient permissions', 404);
  }

  // Verify document exists and user has access
  const document = await Document.findOne({
    _id: documentId,
    $or: [
      { owner: userId },
      { 'collaborators.userId': userId }
    ]
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  if (document.status === 'completed') {
    throw new AppError('Document is already finalized', 400);
  }

  // Generate unique token
  const token = uuidv4();

  // Create signers from active group members (excluding leaders if they are the owner)
  const signers = group.members
    .filter(member => 
      member.status === 'active' && 
      member.userId.toString() !== userId.toString()
    )
    .map((member: any, index: number) => ({
      email: member.email,
      name: member.name,
      role: 'signer',
      order: signingOrder === 'sequential' ? index : 0,
      status: 'pending'
    }));

  if (signers.length === 0) {
    throw new AppError('No active members available for signing', 400);
  }

  // Calculate expiry date
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  // Create signing request
  const signingRequest = await SigningRequest.create({
    document: documentId,
    owner: userId,
    token,
    signers,
    signingOrder,
    message,
    subject,
    status: 'pending',
    expiresAt,
    currentSignerIndex: 0,
    groupSigning: {
      enabled: true,
      groupId: groupId
    }
  });

  // Update document status
  document.status = 'pending';
  await document.save();

  // Send emails to all signers
  for (const signer of signers) {
    try {
      await sendSigningRequestEmail({
        to: signer.email,
        signerName: signer.name,
        documentTitle: document.title,
        ownerName: req.user!.name || 'Someone',
        message,
        subject,
        signingUrl: `${process.env.FRONTEND_URL}/sign/${token}?email=${encodeURIComponent(signer.email)}`,
        fields: [] // Add field logic here if needed
      });
    } catch (error) {
      console.error(`Failed to send email to ${signer.email}:`, error);
    }
  }

  await createAuditLog({
    user: userId,
    document: documentId,
    signingRequest: signingRequest._id.toString(),
    signingGroup: groupId,
    action: 'group_signing_request_created',
    ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    details: { 
      signersCount: signers.length, 
      signingOrder,
      groupName: group.name 
    }
  });

  res.status(201).json({
    success: true,
    message: 'Group signing request created successfully',
    data: signingRequest
  });
});

export const getGroupSigningRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!._id;

  // Verify user is member of the group
  const group = await SigningGroup.findOne({
    _id: groupId,
    'members.userId': userId
  });

  if (!group) {
    throw new AppError('Group not found or access denied', 404);
  }

  const requests = await SigningRequest.find({
    'groupSigning.groupId': groupId
  })
  .populate('document', 'title createdAt')
  .populate('owner', 'name email')
  .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: requests
  });
});
