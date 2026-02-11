import { Request, Response } from 'express';
import Document from '../models/Document';
import DocumentRecipient from '../models/DocumentRecipient';
import User from '../models/User';
import { sendEmail } from '../services/emailService';
import { IDocumentRecipient } from '../models/DocumentRecipient';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: string;
    name: string;
  };
}

// Get all recipients for a document
export const getDocumentRecipients = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    
    const recipients = await DocumentRecipient.find({ document: documentId })
      .populate('witnessFor', 'name email')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: recipients
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add recipients to a document
export const addDocumentRecipients = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { recipients } = req.body; // Array of { email, name, role, message, order }

    console.log('Adding recipients:', {
      documentId,
      documentIdType: typeof documentId,
      userId: req.user?._id,
      userIdType: typeof req.user?._id,
      userEmail: req.user?.email,
      recipients
    });

    // Check if user is authenticated
    if (!req.user?._id) {
      console.log('No user ID found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

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
      documentId: document._id,
      documentIdType: typeof document._id,
      ownerId: document.owner,
      ownerIdType: typeof document.owner,
      userId: req.user?._id,
      isOwner: document.owner.toString() === req.user?._id,
      comparison: `"${document.owner.toString()}" === "${req.user?._id}"`
    });

    if (document.owner.toString() !== req.user?._id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this document. Only document owners can add recipients.'
      });
    }

    // Create recipients
    const newRecipients = await Promise.all(
      recipients.map(async (recipient: any) => {
        const newRecipient = new DocumentRecipient({
          document: documentId,
          email: recipient.email.toLowerCase(),
          name: recipient.name,
          role: recipient.role,
          order: recipient.order || 0,
          message: recipient.message,
          witnessFor: recipient.witnessFor || null
        });
        return await newRecipient.save();
      })
    );

    // Send emails to all recipients
    await Promise.all(
      newRecipients.map(async (recipient: IDocumentRecipient) => {
        const subject = `Document Signature Request: ${document.title}`;
        const body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Document Signature Request</h2>
            <p>Hello ${recipient.name},</p>
            <p>You have been requested to ${recipient.role} the document "<strong>${document.title}</strong>".</p>
            ${recipient.message ? `<p><em>Message from sender:</em> ${recipient.message}</p>` : ''}
            <p><strong>Your role:</strong> ${recipient.role}</p>
            <p>Please click the link below to access the document:</p>
            <a href="${process.env.FRONTEND_URL}/sign-document/${document._id}?email=${encodeURIComponent(recipient.email)}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
              Sign Document
            </a>
            <p style="color: #666; font-size: 14px;">This link will expire in 30 days.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `;

        await sendEmail(recipient.email, subject, body);
      })
    );

    // Update document status to pending
    document.status = 'pending';
    await document.save();

    res.status(201).json({
      success: true,
      data: newRecipients,
      message: 'Recipients added and notified successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update recipient status
export const updateRecipientStatus = async (req: AuthenticatedRequest, res: Response) => {
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
};

// Delete recipient
export const getPublicDocumentSigning = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, email } = req.params;

    console.log('Getting document for recipient signing:', { documentId, email });

    // Find document and verify recipient exists
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
        message: 'You are not authorized to sign this document'
      });
    }

    // Get existing signatures for this document
    const signatures = await Signature.find({
      document: documentId
    }).populate('signer', 'name email');

    res.json({
      success: true,
      data: {
        document,
        recipient,
        signatures
      }
    });
  } catch (error) {
    console.error('Error getting document for signing:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const signDocumentByRecipient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, email } = req.params;
    const { signatureData, type, page, x, y, width, height } = req.body;

    console.log('Signing document by recipient:', { documentId, email, signatureData, type, page, x, y });

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
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete recipient
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
