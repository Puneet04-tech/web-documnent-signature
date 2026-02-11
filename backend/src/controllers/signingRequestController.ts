import { Response } from 'express';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Document, SigningRequest, Signature, User } from '../models';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';
import { sendSigningRequestEmail, sendRejectionEmail, sendCompletionEmail } from '../services/emailService';

export const signingRequestValidation = [
  body('documentId').notEmpty().withMessage('Document ID is required'),
  body('signers').isArray({ min: 1 }).withMessage('At least one signer is required'),
  body('signers.*.email').isEmail().withMessage('Valid email required for each signer'),
  body('signers.*.name').trim().notEmpty().withMessage('Name required for each signer'),
  body('signingOrder').optional().isIn(['sequential', 'parallel'])
];

export const signingRequestController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId, signers, signingOrder, message, subject, expiresInDays } = req.body;
    const userId = req.user!._id;

    // Verify document exists and belongs to user
    const document = await Document.findOne({
      _id: documentId,
      owner: userId,
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    if (document.status === 'completed') {
      throw new AppError('Document is already finalized', 400);
    }

    // Generate unique token
    const token = uuidv4();

    // Process signers - add order for sequential signing
    const processedSigners = signers.map((signer: any, index: number) => ({
      ...signer,
      order: signingOrder === 'sequential' ? index : 0,
      status: 'pending'
    }));

    // Calculate expiry date
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create signing request
    const signingRequest = await SigningRequest.create({
      document: documentId,
      owner: userId,
      token,
      signers: processedSigners,
      signingOrder: signingOrder || 'parallel',
      message,
      subject,
      status: 'pending',
      expiresAt,
      currentSignerIndex: 0
    });

    // Update document status
    document.status = 'pending';
    await document.save();

    // Send emails to signers
    for (const signer of processedSigners) {
      try {
        await sendSigningRequestEmail({
          to: signer.email,
          signerName: signer.name,
          documentTitle: document.title,
          ownerName: req.user!.name || 'Someone',
          message,
          subject,
          signingUrl: `${process.env.FRONTEND_URL}/sign/${token}?email=${encodeURIComponent(signer.email)}`
        });
      } catch (error) {
        console.error(`Failed to send email to ${signer.email}:`, error);
      }
    }

    await createAuditLog({
      user: userId,
      document: documentId,
      signingRequest: signingRequest._id.toString(),
      action: 'signing_request_created',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { signersCount: signers.length, signingOrder }
    });

    res.status(201).json({
      success: true,
      message: 'Signing request created successfully',
      data: { signingRequest }
    });
  }),

  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = { owner: userId };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [signingRequests, total] = await Promise.all([
      SigningRequest.find(query)
        .populate('document', 'title originalName status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SigningRequest.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        signingRequests,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  }),

  getByToken: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token } = req.params;
    const { email } = req.query;

    console.log('Getting signing request by token:', { token, email });

    const signingRequest = await SigningRequest.findOne({ token })
      .populate('document', 'title originalName filePath pageCount owner');

    console.log('Found signing request:', signingRequest);

    if (!signingRequest) {
      throw new AppError('Signing request not found', 404);
    }

    if (signingRequest.status === 'expired' || 
        (signingRequest.expiresAt && new Date() > signingRequest.expiresAt)) {
      throw new AppError('Signing request has expired', 410);
    }

    if (signingRequest.status === 'completed') {
      throw new AppError('Document has already been signed by all parties', 400);
    }

    if (signingRequest.status === 'cancelled') {
      throw new AppError('Signing request has been cancelled', 400);
    }

    // For sequential signing, check if it's this signer's turn
    if (signingRequest.signingOrder === 'sequential' && email) {
      const currentSigner = signingRequest.signers[signingRequest.currentSignerIndex];
      if (currentSigner?.email !== email) {
        throw new AppError('Please wait for your turn to sign', 403);
      }
    }

    // Find signer info
    const signerInfo = email 
      ? signingRequest.signers.find(s => s.email === email)
      : null;

    // Get existing signatures for this document
    const signatures = await Signature.find({
      document: signingRequest.document._id
    }).populate('signer', 'name email');

    await createAuditLog({
      signingRequest: signingRequest._id.toString(),
      action: 'signing_request_viewed',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { signerEmail: email }
    });

    res.json({
      success: true,
      data: {
        signingRequest,
        currentSigner: signerInfo,
        signatures
      }
    });
  }),

  signByToken: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token } = req.params;
    const { email, signatureData, type, page, x, y, width, height, rejectReason } = req.body;

    const signingRequest = await SigningRequest.findOne({ token })
      .populate('document', 'title owner');

    if (!signingRequest) {
      throw new AppError('Signing request not found', 404);
    }

    const signerIndex = signingRequest.signers.findIndex(s => s.email === email);
    if (signerIndex === -1) {
      throw new AppError('You are not authorized to sign this document', 403);
    }

    const signer = signingRequest.signers[signerIndex];

    // Check sequential signing order
    if (signingRequest.signingOrder === 'sequential' && signerIndex !== signingRequest.currentSignerIndex) {
      throw new AppError('Please wait for your turn to sign', 403);
    }

    // Handle rejection
    if (rejectReason) {
      signer.status = 'rejected';
      await signingRequest.save();

      // Send rejection email to document owner
      try {
        const documentOwner = await User.findById((signingRequest.document as any).owner);
        if (documentOwner) {
          await sendRejectionEmail(
            documentOwner.email,
            (signingRequest.document as any).title,
            signer.name,
            email,
            rejectReason
          );
        }
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      await createAuditLog({
        signingRequest: signingRequest._id.toString(),
        action: 'signature_rejected',
        ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { signerEmail: email, reason: rejectReason }
      });

      return res.json({
        success: true,
        message: 'Signing request rejected'
      });
    }

    // Create or update signature
    let user = await User.findOne({ email });
    
    // Create a temporary user if not exists (for external signers)
    if (!user) {
      user = await User.create({
        name: signer.name,
        email,
        password: uuidv4(), // Random password
        isActive: true
      });
    }

    // Check if signature already exists
    let signature = await Signature.findOne({
      document: signingRequest.document._id,
      signer: user._id
    });

    if (signature) {
      signature.page = page;
      signature.x = x;
      signature.y = y;
      signature.width = width || 150;
      signature.height = height || 50;
      signature.type = type;
      signature.signatureData = signatureData;
      signature.status = 'pending';
    } else {
      signature = await Signature.create({
        document: signingRequest.document._id,
        signer: user._id,
        signingRequest: signingRequest._id,
        page,
        x,
        y,
        width: width || 150,
        height: height || 50,
        type,
        signatureData,
        status: 'pending'
      });
    }

    // Update signer status
    signer.status = 'signed';
    signer.signedAt = new Date();

    // Update signing request progress
    if (signingRequest.signingOrder === 'sequential') {
      signingRequest.currentSignerIndex++;
    }

    // Check if all signers have signed
    const allSigned = signingRequest.signers.every(s => s.status === 'signed');
    if (allSigned) {
      signingRequest.status = 'completed';
      signingRequest.completedAt = new Date();
    } else {
      signingRequest.status = 'in_progress';
    }

    await signingRequest.save();

    await createAuditLog({
      user: user._id.toString(),
      document: signingRequest.document._id.toString(),
      signingRequest: signingRequest._id.toString(),
      action: 'signature_signed',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { signerEmail: email, page, x, y, type }
    });

    res.json({
      success: true,
      message: 'Document signed successfully',
      data: {
        signature,
        completed: allSigned
      }
    });
  }),

  resend: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id;

    const signingRequest = await SigningRequest.findOne({
      _id: id,
      owner: userId
    }).populate('document', 'title');

    if (!signingRequest) {
      throw new AppError('Signing request not found', 404);
    }

    // Resend to pending signers
    for (const signer of signingRequest.signers) {
      if (signer.status === 'pending') {
        try {
          await sendSigningRequestEmail({
            to: signer.email,
            signerName: signer.name,
            documentTitle: (signingRequest.document as any).title,
            ownerName: req.user!.name || 'Someone',
            message: signingRequest.message,
            subject: signingRequest.subject,
            signingUrl: `${process.env.FRONTEND_URL}/sign/${signingRequest.token}?email=${encodeURIComponent(signer.email)}`
          });
        } catch (error) {
          console.error(`Failed to resend email to ${signer.email}:`, error);
        }
      }
    }

    signingRequest.reminderSentAt = new Date();
    await signingRequest.save();

    res.json({
      success: true,
      message: 'Signing request reminder sent'
    });
  }),

  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id;

    const signingRequest = await SigningRequest.findOne({
      _id: id,
      owner: userId
    });

    if (!signingRequest) {
      throw new AppError('Signing request not found', 404);
    }

    if (signingRequest.status === 'completed') {
      throw new AppError('Cannot cancel completed signing request', 400);
    }

    signingRequest.status = 'cancelled';
    await signingRequest.save();

    res.json({
      success: true,
      message: 'Signing request cancelled'
    });
  })
};
