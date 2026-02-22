import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { Document } from '../models';
import fs from 'fs/promises';
import path from 'path';

// Find and serve PDF by document ID
export const findAndServePdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  const userId = req.user!._id;

  // Find document
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

  // Try to find the file in uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const files = await fs.readdir(uploadsDir);
  
  // Try multiple file name patterns
  const possibleNames = [
    document.fileName,
    document.originalName,
    document.fileName?.replace('.pdf', '') + '.pdf'
  ];
  
  let foundFile = null;
  for (const name of possibleNames) {
    if (files.includes(name)) {
      foundFile = name;
      break;
    }
  }
  
  if (!foundFile) {
    throw new AppError('PDF file not found in uploads directory', 404);
  }

  // Read and serve the file
  const filePath = path.join(uploadsDir, foundFile);
  const fileBuffer = await fs.readFile(filePath);
  
  // Set headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', fileBuffer.length);
  res.setHeader('Content-Disposition', `inline; filename="${foundFile}"`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  // Send file
  res.send(fileBuffer);
});

export const pdfFixController = {
  findAndServePdf
};
