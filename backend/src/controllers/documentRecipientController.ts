import { Request, Response } from 'express';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Document, DocumentRecipient, Signature, SignatureField, User } from '../models';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';
import { sendEmail } from '../services/emailService';

interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: string;
    name: string;
  };
}

interface IDocumentRecipient {
  _id: string;
  document: string;
  email: string;
  name: string;
  role: string;
  message: string;
  witnessFor: string | null;
  status: string;
  signedAt: Date | null;
  ipAddress: string;
  userAgent: string;
}

const documentRecipientValidation = [
  body('documentId').notEmpty().withMessage('Document ID is required'),
  body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
  body('recipients.*.email').isEmail().withMessage('Valid email required for each recipient'),
  body('recipients.*.name').trim().notEmpty().withMessage('Name required for each recipient'),
  body('recipients.*.role').isIn(['signer', 'witness', 'reviewer']).withMessage('Valid role required for each recipient')
];

export const getDocumentRecipients = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!._id;

    // Check if document exists and user has permission
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user is the document owner
    if (document.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only document owners can view recipients'
      });
    }

    // Get all recipients for this document
    const recipients = await DocumentRecipient.find({ document: documentId })
      .populate('witnessFor', 'name email')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: { recipients }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export const addDocumentRecipients = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { recipients } = req.body;
    const userId = req.user!._id;

    console.log('=== ADDING DOCUMENT RECIPIENTS ===');
    console.log('Document ID received:', documentId);
    console.log('Document ID type:', typeof documentId);
    console.log('User ID:', userId);
    console.log('Recipients:', recipients);

    // Check if document exists and user has permission (only owners can add recipients)
    const document = await Document.findById(documentId);
    if (!document) {
      console.log('Document not found for ID:', documentId);
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    console.log('Document found:', {
      id: document._id,
      title: document.title,
      fileName: document.fileName
    });

    // Check if user is the document owner
    if (document.owner.toString() !== userId) {
      console.log('User is not document owner:', {
        documentOwner: document.owner.toString(),
        requestingUser: userId,
        isOwner: false
      });
      return res.status(403).json({
        success: false,
        message: 'Only document owners can add recipients'
      });
    }

    console.log('User is document owner, proceeding to add recipients');

    // Create recipients
    console.log('Creating recipients...');
    const newRecipients = await Promise.all(
      recipients.map(async (recipient: any) => {
        console.log('Creating recipient:', recipient);
        const newRecipient = await DocumentRecipient.create({
          document: documentId,
          email: recipient.email.toLowerCase(),
          name: recipient.name,
          role: recipient.role,
          message: recipient.message || '',
          witnessFor: recipient.witnessFor || null
        });
        console.log('Recipient created:', newRecipient);
        return newRecipient;
      })
    );

    console.log('All recipients created:', newRecipients);

    // Send emails to all recipients
    console.log('Sending emails to recipients...');
    try {
      await Promise.all(
        newRecipients.map(async (recipient: IDocumentRecipient) => {
          console.log('Sending email to:', recipient.email);
          const subject = `Document Signature Request: ${document.title}`;
          const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Document Signature Request</h2>
              <p>Hello ${recipient.name},</p>
              <p>You have been requested to ${recipient.role} document "<strong>${document.title}</strong>".</p>
              ${recipient.message ? `<p><em>Message from sender:</em> ${recipient.message}</p>` : ''}
              <p><strong>Your role:</strong> ${recipient.role}</p>
              <p>Please click of link below to access to document:</p>
              <a href="${process.env.FRONTEND_URL}/sign-document/${documentId}?email=${encodeURIComponent(recipient.email)}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
                Sign Document
              </a>
              <p style="color: #666; font-size: 14px;">This link will expire in 30 days.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            </div>
          `;

          await sendEmail(recipient.email, subject, body);
          console.log('Email sent successfully to:', recipient.email);
        })
      );
      console.log('All emails sent successfully');
    } catch (emailError) {
      console.error('Error sending emails:', emailError);
      // Continue even if email fails
    }

    await createAuditLog({
      user: userId,
      document: documentId,
      action: 'document_recipients_added',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { recipientsCount: recipients.length }
    });

    res.status(201).json({
      success: true,
      message: 'Recipients added successfully',
      data: { recipients: newRecipients }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export const updateRecipientStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientId } = req.params;
    const { status, ipAddress, userAgent } = req.body;

    const recipient = await DocumentRecipient.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Update recipient
    recipient.status = status;
    recipient.signedAt = status === 'signed' ? new Date() : undefined;
    recipient.ipAddress = ipAddress;
    recipient.userAgent = userAgent;
    await recipient.save();

    // Check if all signers are complete
    const document = await Document.findById(recipient.document);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const allSigners = await DocumentRecipient.find({
      document: recipient.document,
      role: 'signer'
    });

    const allSigned = allSigners.every(s => s.status === 'signed');
    
    if (allSigned) {
      document.status = 'completed';
      await document.save();
    } else if (allSigners.some(s => s.status === 'signed')) {
      document.status = 'partially_signed';
      await document.save();
    }

    res.json({
      success: true,
      data: recipient,
      message: `Recipient status updated to ${status}`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export const getPublicDocumentSigning = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, email } = req.params;

    console.log('=== DOCUMENT RECIPIENT ROUTE ACCESSED ===');
    console.log('Document ID:', documentId);
    console.log('Email:', email);
    console.log('Route:', req.originalUrl);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    console.log('User:', req.user);
    console.log('Timestamp:', new Date().toISOString());

    // Find document and verify recipient exists
    const document = await Document.findById(documentId);
    if (!document) {
      console.log('Document not found for ID:', documentId);
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    console.log('Document found:', {
      id: document._id,
      title: document.title,
      fileName: document.fileName
    });

    // Find recipient record
    console.log('Looking for recipient with:', {
      documentId,
      email: email.toLowerCase().trim()
    });

    // First, let's see all recipients for this document
    const allRecipients = await DocumentRecipient.find({ document: documentId });
    console.log('All recipients for this document:', allRecipients.map(r => ({
      id: r._id,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status
    })));

    const recipient = await DocumentRecipient.findOne({
      document: documentId,
      email: email.toLowerCase().trim()
    });

    console.log('Recipient lookup:', {
      documentId,
      originalEmail: email,
      normalizedEmail: email.toLowerCase().trim(),
      recipient: recipient
    });

    if (!recipient) {
      console.log('Recipient not found for email:', email);
      return res.status(404).json({
        success: false,
        message: 'Document not found or you do not have permission to access it. Please check the email address and ensure you have been added as a recipient.'
      });
    }

    console.log('Recipient found:', {
      id: recipient._id,
      name: recipient.name,
      email: recipient.email,
      role: recipient.role,
      status: recipient.status
    });

    // Get existing signatures for this document
    const signatures = await Signature.find({
      document: documentId
    }).populate('signer', 'name email');

    console.log('Existing signatures found:', signatures.length);

    // Get signature fields for this document (public access for recipients)
    const signatureFields = await SignatureField.find({
      document: documentId
    }).sort({ page: 1, y: 1, x: 1 });

    console.log('Signature fields found:', signatureFields.length);

    res.json({
      success: true,
      data: {
        document,
        recipient,
        signatures,
        fields: signatureFields
      }
    });
  } catch (error) {
    console.error('Error getting document for signing:', error);
    
    // Type guard for error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    const errorStatus = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
    const errorName = error instanceof Error ? error.name : undefined;
    
    console.error('Error stack:', errorStack);
    console.error('Error details:', {
      message: errorMessage,
      status: errorStatus,
      code: errorCode,
      name: errorName
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const downloadSignedDocument = async (req: Request, res: Response) => {
  try {
    const { documentId, email } = req.params;

    // Find document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Find recipient record
    const recipient = await DocumentRecipient.findOne({
      document: documentId,
      email: email.toLowerCase()
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Check if recipient has signed
    if (recipient.status !== 'signed') {
      return res.status(400).json({
        success: false,
        message: 'Document must be signed before downloading'
      });
    }

    // Use signed file if available, otherwise use original
    const filePath = document.signedFilePath || document.filePath;
    
    // Construct full path
    const fullPath = path.join(__dirname, '..', '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    
    // Send file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const signDocumentByRecipient = async (req: Request, res: Response) => {
  try {
    const { documentId, email } = req.params;
    const { signatureData, type, page, x, y, width, height } = req.body;

    console.log('Signing document by recipient:', { documentId, email, signatureData, type, page, x, y, width, height });

    // Find document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Find recipient record
    const recipient = await DocumentRecipient.findOne({
      document: documentId,
      email: email.toLowerCase()
    });

    if (!recipient) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to sign this document'
      });
    }

    if (recipient.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Document already signed or action not allowed'
      });
    }

    // Create or find user
    let user = await User.findOne({ email });
    
    // Create a temporary user if not exists (for external signers)
    if (!user) {
      user = await User.create({
        name: recipient.name,
        email,
        password: uuidv4(), // Random password
        isActive: true
      });
    }

    // Create signature
    const signature = await Signature.create({
      document: documentId,
      signer: user._id,
      documentRecipient: recipient._id,
      page,
      x,
      y,
      width: width || 150,
      height: height || 50,
      type,
      signatureData,
      status: 'signed'
    });

    // Create or update signature field for display on PDF
    await SignatureField.findOneAndUpdate(
      {
        document: documentId,
        assignedTo: email.toLowerCase(),
        page
      },
      {
        document: documentId,
        page,
        x,
        y,
        width: width || 150,
        height: height || 50,
        type: 'signature',
        label: 'Signature',
        assignedTo: email.toLowerCase(),
        required: true,
        value: signatureData,
        signer: user._id,
        status: 'signed',
        signature: signature._id
      },
      {
        upsert: true,
        new: true
      }
    );

    // Update recipient status
    recipient.status = 'signed';
    recipient.signedAt = new Date();
    await recipient.save();

    // Update document status if all recipients signed
    const allRecipients = await DocumentRecipient.find({ document: documentId });
    const allSigned = allRecipients.every(r => r.status === 'signed');
    
    if (allSigned) {
      document.status = 'completed';
      await document.save();
    }

    console.log('Document signed successfully:', {
      signatureId: signature._id,
      recipientStatus: recipient.status,
      documentStatus: document.status,
      allSigned
    });

    res.json({
      success: true,
      message: 'Document signed successfully',
      data: {
        signature,
        completed: allSigned
      }
    });
  } catch (error) {
    console.error('Error signing document:', error);
    
    // Type guard to safely access error properties
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error stack:', errorStack);
    console.error('Error details:', {
      message: errorMessage,
      status: error && typeof error === 'object' && 'status' in error ? error.status : undefined,
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteRecipient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientId } = req.params;

    const recipient = await DocumentRecipient.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Check document ownership
    const document = await Document.findById(recipient.document);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user is either the owner or an assigned recipient
    const isOwner = document.owner.toString() === req.user?._id;
    const isAssignedRecipient = await DocumentRecipient.findOne({
      document: recipient.document,
      email: req.user?.email
    });

    if (!isOwner && !isAssignedRecipient) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this recipient'
      });
    }

    await DocumentRecipient.findByIdAndDelete(recipientId);

    res.json({
      success: true,
      message: 'Recipient deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
