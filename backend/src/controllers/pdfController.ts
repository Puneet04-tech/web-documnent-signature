import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { Document } from '../models';

// Serve PDF content from MongoDB
export const servePdfFromMongo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  const userId = req.user!._id;

  // Find document in MongoDB
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

  // Check if document has PDF content
  if (!document.pdfContent) {
    throw new AppError('PDF content not found', 404);
  }

  // Convert base64 to buffer
  const pdfBuffer = Buffer.from(document.pdfContent, 'base64');

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

  // Send PDF content
  res.send(pdfBuffer);
});

// Serve signed PDF content from MongoDB
export const serveSignedPdfFromMongo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  const userId = req.user!._id;

  // Find document in MongoDB
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

  // Check if document has signed PDF content
  if (!document.signedPdfContent) {
    throw new AppError('Signed PDF content not found', 404);
  }

  // Convert base64 to buffer
  const pdfBuffer = Buffer.from(document.signedPdfContent, 'base64');

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('Content-Disposition', `inline; filename="signed_${document.originalName}"`);
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

  // Send PDF content
  res.send(pdfBuffer);
});

// Public PDF serving (for signing portal - no auth required)
export const servePublicPdfFromMongo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;

  // Find document (no auth check for public access)
  const document = await Document.findById(documentId);

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Check if document has PDF content
  if (!document.pdfContent) {
    throw new AppError('PDF content not found', 404);
  }

  // Convert base64 to buffer
  const pdfBuffer = Buffer.from(document.pdfContent, 'base64');

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

  // Send PDF content
  res.send(pdfBuffer);
});

export const pdfController = {
  servePdfFromMongo,
  serveSignedPdfFromMongo,
  servePublicPdfFromMongo
};
