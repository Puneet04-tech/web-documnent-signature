import { Response } from 'express';
import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import { SignatureField, Document, Signature, User } from '../models';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

export const signatureFieldValidation = {
  create: [
    body('documentId').notEmpty().withMessage('Document ID is required'),
    body('page').isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    body('x').isNumeric().withMessage('X coordinate is required'),
    body('y').isNumeric().withMessage('Y coordinate is required'),
    body('type').isIn(['signature', 'initials', 'name', 'date', 'text', 'input', 'checkbox', 'stamp']).withMessage('Invalid field type'),
  ],
  update: [
    param('id').notEmpty().withMessage('Field ID is required'),
    body('value').optional().isString().withMessage('Value must be a string'),
  ],
  fill: [
    body('fieldId').notEmpty().withMessage('Field ID is required'),
    body('value').notEmpty().withMessage('Value is required'),
    body('type').notEmpty().withMessage('Type is required'),
  ]
};

export const signatureFieldController = {
  // Get all fields for a document
  getByDocument: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { docId } = req.params;
    const userId = req.user!._id;

    const document = await Document.findOne({
      _id: docId,
      $or: [{ owner: userId }, { 'sharedWith.user': userId }],
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const fields = await SignatureField.find({ document: docId })
      .populate('signer', 'name email')
      .sort({ page: 1, y: 1, x: 1 });

    res.json({
      success: true,
      data: { fields }
    });
  }),

  // Create a new field
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId, page, x, y, width, height, type, label, placeholder, required, assignedTo } = req.body;
    const userId = req.user!._id;

    const document = await Document.findOne({
      _id: documentId,
      owner: userId,
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const field = await SignatureField.create({
      document: documentId,
      page,
      x,
      y,
      width: width || 150,
      height: height || 50,
      type,
      label,
      placeholder,
      required: required !== false,
      assignedTo
    });

    await createAuditLog({
      user: userId,
      document: documentId,
      action: 'signature_added',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { fieldId: field._id, type, page, x, y }
    });

    res.status(201).json({
      success: true,
      message: 'Field created successfully',
      data: { field }
    });
  }),

  // Update a field (move, resize, change properties)
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { x, y, width, height, label, placeholder, required, assignedTo } = req.body;
    const userId = req.user!._id;

    const field = await SignatureField.findById(id).populate('document');
    if (!field) {
      throw new AppError('Field not found', 404);
    }

    const document = field.document as any;
    if (document.owner.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (x !== undefined) field.x = x;
    if (y !== undefined) field.y = y;
    if (width !== undefined) field.width = width;
    if (height !== undefined) field.height = height;
    if (label !== undefined) field.label = label;
    if (placeholder !== undefined) field.placeholder = placeholder;
    if (required !== undefined) field.required = required;
    if (assignedTo !== undefined) field.assignedTo = assignedTo;

    await field.save();

    res.json({
      success: true,
      message: 'Field updated successfully',
      data: { field }
    });
  }),

  // Delete a field
  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!._id;

    const field = await SignatureField.findById(id).populate('document');
    if (!field) {
      throw new AppError('Field not found', 404);
    }

    const document = field.document as any;
    if (document.owner.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }

    await SignatureField.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Field deleted successfully'
    });
  }),

  // Fill a field with signature/data
  fill: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fieldId, value, type, signatureData } = req.body;
    const userId = req.user!._id;

    const field = await SignatureField.findById(fieldId).populate('document');
    if (!field) {
      throw new AppError('Field not found', 404);
    }

    const document = field.document as any;
    
    // Check if user is authorized to fill this field
    const isOwner = document.owner.toString() === userId.toString();
    const isAssigned = field.assignedTo === req.user!.email;
    
    if (!isOwner && !isAssigned && field.required) {
      throw new AppError('Not authorized to fill this field', 403);
    }

    // Update field value
    field.value = value;
    field.status = 'completed';
    field.signer = new mongoose.Types.ObjectId(userId);
    await field.save();

    // Create actual signature record for signature/initials types
    if (type === 'signature' || type === 'initials' || type === 'drawn') {
      await Signature.create({
        document: document._id,
        signer: new mongoose.Types.ObjectId(userId),
        page: field.page,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        type: type === 'drawn' ? 'drawn' : (type === 'initials' ? 'typed' : 'drawn'),
        signatureData: signatureData || value,
        status: 'signed'
      });
    }

    // Update document status
    if (document.status === 'draft' || document.status === 'pending') {
      document.status = 'partially_signed';
      await document.save();
    }

    await createAuditLog({
      user: userId,
      document: document._id,
      action: 'signature_signed',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { fieldId, type, page: field.page }
    });

    res.json({
      success: true,
      message: 'Field filled successfully',
      data: { field }
    });
  }),

  // Link fields across pages (copy field to multiple pages)
  linkField: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fieldId, targetPages } = req.body;
    const userId = req.user!._id;

    const sourceField = await SignatureField.findById(fieldId).populate('document');
    if (!sourceField) {
      throw new AppError('Field not found', 404);
    }

    const document = sourceField.document as any;
    if (document.owner.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }

    const linkedFields = [];
    const linkedFieldId = sourceField.linkedFieldId || sourceField._id.toString();

    for (const page of targetPages) {
      if (page === sourceField.page) continue;

      const newField = await SignatureField.create({
        document: sourceField.document,
        page,
        x: sourceField.x,
        y: sourceField.y,
        width: sourceField.width,
        height: sourceField.height,
        type: sourceField.type,
        label: sourceField.label,
        placeholder: sourceField.placeholder,
        required: sourceField.required,
        assignedTo: sourceField.assignedTo,
        linkedFieldId
      });

      linkedFields.push(newField);
    }

    // Update source field with linked ID if not already set
    if (!sourceField.linkedFieldId) {
      sourceField.linkedFieldId = linkedFieldId;
      await sourceField.save();
    }

    res.json({
      success: true,
      message: `Field linked to ${linkedFields.length} pages`,
      data: { linkedFields, sourceField }
    });
  }),

  // Bulk create fields from template
  createFromTemplate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId, template } = req.body;
    const userId = req.user!._id;

    const document = await Document.findOne({
      _id: documentId,
      owner: userId,
      isDeleted: false
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const fields = await SignatureField.insertMany(
      template.fields.map((f: any) => ({
        document: documentId,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        assignedTo: f.assignedTo
      }))
    );

    res.status(201).json({
      success: true,
      message: `${fields.length} fields created from template`,
      data: { fields }
    });
  })
};
