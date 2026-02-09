import { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { Document, Signature, SigningRequest } from '../models';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';
import { config } from '../config';

export const documentController = {
  upload: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { title, description } = req.body;
    const userId = req.user!._id;

    // Get page count from PDF
    let pageCount = 1;
    try {
      const pdfBytes = await fs.readFile(req.file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pageCount = pdfDoc.getPageCount();
    } catch (error) {
      console.error('Error reading PDF page count:', error);
    }

    const document = await Document.create({
      title: title || req.file.originalname.replace('.pdf', ''),
      description,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      pageCount,
      owner: userId,
      status: 'draft'
    });

    await createAuditLog({
      user: userId,
      document: document._id.toString(),
      action: 'document_created',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { 
        title: document.title, 
        originalName: document.originalName,
        pageCount 
      }
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document }
    });
  }),

  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id;
    const { status, search, page = 1, limit = 10 } = req.query;

    const query: any = { 
      owner: userId, 
      isDeleted: false 
    };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Document.countDocuments(query)
    ]);

    // Get signature counts for each document
    const docIds = documents.map(d => d._id.toString());
    const signatureCounts = await Signature.aggregate([
      { $match: { document: { $in: docIds.map(id => new (require('mongoose').Types.ObjectId)(id)) } } },
      { $group: { _id: '$document', count: { $sum: 1 } } }
    ]);

    const countMap = new Map(signatureCounts.map(s => [s._id.toString(), s.count]));

    const documentsWithCounts = documents.map(doc => ({
      ...doc,
      signatureCount: countMap.get(doc._id.toString()) || 0
    }));

    res.json({
      success: true,
      data: {
        documents: documentsWithCounts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  }),

  get: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id;

    const document = await Document.findOne({
      _id: id,
      owner: userId,
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Get signatures
    const signatures = await Signature.find({ document: id })
      .populate('signer', 'name email')
      .sort({ createdAt: -1 });

    // Get signing requests
    const signingRequests = await SigningRequest.find({ document: id })
      .sort({ createdAt: -1 });

    await createAuditLog({
      user: userId,
      document: id,
      action: 'document_viewed',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    res.json({
      success: true,
      data: {
        document,
        signatures,
        signingRequests
      }
    });
  }),

  download: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id;
    const signed = req.query.signed as string | undefined;

    const document = await Document.findOne({
      _id: id,
      owner: userId,
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const isSignedRequest = signed === 'true';
    const filePath = isSignedRequest && document.signedFilePath
      ? path.join(__dirname, '..', '..', document.signedFilePath)
      : path.join(__dirname, '..', '..', document.filePath);

    console.log('Download request:', { id, signed, filePath, signedFilePath: document.signedFilePath });

    // Check if the requested file exists
    try {
      await fs.access(filePath);
      console.log('File exists:', filePath);
    } catch (err) {
      console.error('File access error:', err);
      // If signed file doesn't exist but was requested, fallback to original
      if (isSignedRequest && document.signedFilePath) {
        const originalPath = path.join(__dirname, '..', '..', document.filePath);
        try {
          await fs.access(originalPath);
          console.log('Fallback to original file:', originalPath);
          // Return original file with a header indicating it's not finalized
          res.setHeader('X-Document-Status', 'not-finalized');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
          return res.sendFile(originalPath);
        } catch {
          throw new AppError('Original file not found', 404);
        }
      }
      throw new AppError(`File not found: ${filePath}`, 404);
    }

    await createAuditLog({
      user: userId,
      document: id,
      action: 'document_downloaded',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { signed: isSignedRequest }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.sendFile(filePath);
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id;

    const document = await Document.findOne({
      _id: id,
      owner: userId,
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Soft delete
    document.isDeleted = true;
    document.deletedAt = new Date();
    await document.save();

    await createAuditLog({
      user: userId,
      document: id,
      action: 'document_deleted',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  })
};
