import { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { body } from 'express-validator';
import { Document, Signature, SigningRequest } from '../models';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';
import { config } from '../config';

export const signatureValidation = [
  body('documentId').notEmpty().withMessage('Document ID is required'),
  body('page').isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('x').isNumeric().withMessage('X coordinate is required'),
  body('y').isNumeric().withMessage('Y coordinate is required'),
  body('type').isIn(['drawn', 'typed', 'uploaded']).withMessage('Invalid signature type'),
  body('signatureData').notEmpty().withMessage('Signature data is required')
];

export const signatureController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId, page, x, y, width, height, type, signatureData, signingRequestId } = req.body;
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
      throw new AppError('Document is already signed and finalized', 400);
    }

    // Check if signature already exists on this document by this user
    const existingSignature = await Signature.findOne({
      document: documentId,
      signer: userId
    });

    if (existingSignature) {
      // Update existing signature
      existingSignature.page = page;
      existingSignature.x = x;
      existingSignature.y = y;
      existingSignature.width = width || 150;
      existingSignature.height = height || 50;
      existingSignature.type = type;
      existingSignature.signatureData = signatureData;
      await existingSignature.save();

      await createAuditLog({
        user: userId,
        document: documentId,
        action: 'signature_added',
        ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { page, x, y, type, updated: true }
      });

      return res.json({
        success: true,
        message: 'Signature updated successfully',
        data: { signature: existingSignature }
      });
    }

    // Create new signature
    const signature = await Signature.create({
      document: documentId,
      signer: userId,
      signingRequest: signingRequestId || null,
      page,
      x,
      y,
      width: width || 150,
      height: height || 50,
      type,
      signatureData,
      status: 'pending'
    });

    // Update document status
    if (document.status === 'draft' || document.status === 'pending') {
      document.status = 'partially_signed';
      await document.save();
    }

    // Update signature status to signed immediately
    signature.status = 'signed';
    signature.signedAt = new Date();
    await signature.save();

    await createAuditLog({
      user: userId,
      document: documentId,
      action: 'signature_added',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { page, x, y, type }
    });

    res.status(201).json({
      success: true,
      message: 'Signature added successfully',
      data: { signature }
    });
  }),

  getByDocument: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { docId } = req.params;
    const userId = req.user!._id;

    // Verify document exists and belongs to user
    const document = await Document.findOne({
      _id: docId,
      owner: userId,
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const signatures = await Signature.find({ document: docId })
      .populate('signer', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { signatures }
    });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id;

    const signature = await Signature.findOne({
      _id: id,
      signer: userId
    });

    if (!signature) {
      throw new AppError('Signature not found', 404);
    }

    await Signature.deleteOne({ _id: id });

    await createAuditLog({
      user: userId,
      document: signature.document.toString(),
      action: 'signature_removed',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    res.json({
      success: true,
      message: 'Signature removed successfully'
    });
  }),

  finalize: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.body;
    const userId = req.user!._id;

    // Get document
    const document = await Document.findOne({
      _id: documentId,
      owner: userId,
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Get all signatures for this document
    const signatures = await Signature.find({
      document: documentId,
      status: { $in: ['pending', 'signed'] }
    }).populate('signer', 'name email');

    if (signatures.length === 0) {
      throw new AppError('No signatures to finalize', 400);
    }

    // Load PDF
    const pdfBytes = await fs.readFile(document.filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add signatures to PDF
    for (const signature of signatures) {
      const page = pages[signature.page - 1];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert coordinates (Y is flipped in PDF)
      const x = signature.x;
      const y = pageHeight - signature.y - signature.height;

      if (signature.type === 'typed') {
        // Draw text signature
        page.drawText(signature.signatureData, {
          x,
          y,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });
      } else if (signature.type === 'drawn') {
        // For drawn signatures, we'd typically embed an image
        // For now, draw a placeholder with signer name
        const signerName = (signature.signer as any).name || 'Signed';
        page.drawText(`Signed by: ${signerName}`, {
          x,
          y,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });

        // Draw a border box
        page.drawRectangle({
          x: x - 2,
          y: y - 2,
          width: signature.width + 4,
          height: signature.height + 4,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1
        });
      }

      // Update signature status
      signature.status = 'signed';
      signature.signedAt = new Date();
      await signature.save();
    }

    // Add timestamp and document info
    const firstPage = pages[0];
    const { height: pageHeight } = firstPage.getSize();
    firstPage.drawText(`Document finalized on ${new Date().toISOString()}`, {
      x: 50,
      y: 30,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Save signed PDF
    const signedPdfBytes = await pdfDoc.save();
    const signedFileName = `signed_${document.fileName}`;
    const signedFilePath = path.join(config.upload.directory, signedFileName);
    await fs.writeFile(signedFilePath, signedPdfBytes);

    // Update document
    document.signedFilePath = signedFilePath;
    document.status = 'completed';
    await document.save();

    await createAuditLog({
      user: userId,
      document: documentId,
      action: 'document_finalized',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { signaturesCount: signatures.length }
    });

    res.json({
      success: true,
      message: 'Document finalized successfully',
      data: {
        document,
        downloadUrl: `/api/docs/${documentId}/download?signed=true`
      }
    });
  })
};
