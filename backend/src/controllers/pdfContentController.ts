import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { Document } from '../models';

// Upload PDF content directly to MongoDB
export const uploadPdfContent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  const { pdfContent } = req.body;
  const userId = req.user!._id;

  if (!pdfContent) {
    throw new AppError('PDF content is required', 400);
  }

  // Find document
  const document = await Document.findOne({
    _id: documentId,
    owner: userId
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Update document with PDF content
  await Document.findByIdAndUpdate(documentId, {
    pdfContent: pdfContent
  });

  res.json({
    success: true,
    message: 'PDF content uploaded successfully',
    data: { document }
  });
});

export const pdfContentController = {
  uploadPdfContent
};
