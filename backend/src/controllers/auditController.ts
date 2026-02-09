import { Response } from 'express';
import { AuditLog } from '../models';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const auditController = {
  getByDocument: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { docId } = req.params;
    const userId = req.user!._id;

    // Verify user has access to this document
    const Document = require('../models').Document;
    const document = await Document.findOne({
      _id: docId,
      owner: userId
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [auditLogs, total] = await Promise.all([
      AuditLog.find({ document: docId })
        .populate('user', 'name email')
        .populate('signingRequest', 'token')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments({ document: docId })
    ]);

    res.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  })
};
