import { Response } from 'express';
import mongoose from 'mongoose';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';
import Template from '../models/Template';
import Document from '../models/Document';
import SignatureField from '../models/SignatureField';
import { createAuditLog } from '../middleware/audit';

export const templateController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, category, isPublic, fields } = req.body;
    if (!name) throw new AppError('Template name is required', 400);

    const tpl = await Template.create({
      name,
      description,
      category,
      isPublic: !!isPublic,
      fields: Array.isArray(fields) ? fields : [],
      owner: req.user?._id || null
    });

    res.status(201).json({ success: true, data: tpl });
  }),

  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { search, category } = req.query;
    const q: any = {};
    if (search) q.$text = { $search: String(search) };
    if (category && String(category) !== 'all') q.category = category;

    // by default expose public + user's own templates
    const userId = req.user?._id;
    q.$or = [{ isPublic: true }];
    if (userId) q.$or.push({ owner: userId });

    const templates = await Template.find(q).sort({ createdAt: -1 }).lean();

    res.json({ success: true, data: templates });
  }),

  get: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tpl = await Template.findById(id).lean();
    if (!tpl) throw new AppError('Template not found', 404);
    res.json({ success: true, data: tpl });
  }),

  // Use template -> create a new Document and (optionally) create signature fields
  use: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { title, description } = req.body;

    console.log('templateController.use called', { templateId: id, body: req.body, user: req.user?._id });

    const tpl = await Template.findById(id).lean();
    if (!tpl) {
      console.warn('Template not found in DB', id);
      throw new AppError('Template not found', 404);
    }

    // create a draft Document (no file attached yet)
    const placeholderBase = `draft-from-template-${id}-${Date.now()}`;
    const docPayload = {
      title: title || tpl.name,
      description: description || tpl.description || '',
      // use non-empty placeholders so Mongoose "required" validators pass for draft documents
      fileName: `${placeholderBase}.pdf`,
      originalName: `${placeholderBase}.pdf`,
      filePath: `uploads/${placeholderBase}.pdf`,
      fileSize: 0,
      mimeType: 'application/pdf',
      pageCount: tpl.fields?.reduce((max: number, f: any) => Math.max(max, f.page || 1), 1) || 1,
      owner: req.user?._id,
      status: 'draft'
    } as any;

    console.log('Creating Document with payload:', docPayload);
    let doc: any;
    try {
      doc = await Document.create(docPayload);
      console.log('Document created from template:', doc._id.toString());
    } catch (err: any) {
      console.error('Error creating document from template:', err);
      throw new AppError('Failed to create document from template: ' + (err?.message || 'unknown'), 500);
    }

    // create signature fields for the new document if template has fields
    if (tpl.fields && tpl.fields.length) {
      const fieldsToCreate = tpl.fields.map((f: any) => ({
        document: doc._id,
        page: f.page || 1,
        x: f.x || 0,
        y: f.y || 0,
        width: f.width || 150,
        height: f.height || 50,
        type: f.type,
        label: f.label || null,
        required: typeof f.required === 'boolean' ? f.required : true
      }));

      try {
        const createdFields = await SignatureField.insertMany(fieldsToCreate);
        console.log('Signature fields created:', createdFields.length);
      } catch (err) {
        console.error('Error inserting signature fields from template:', err);
        // continue — document exists; return success but mention fields failed
        await createAuditLog({
          user: req.user?._id,
          document: doc._id.toString(),
          action: 'document_created',
          ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          details: { fromTemplate: id, fieldsCreated: false }
        });

        return res.status(201).json({ success: true, data: { document: doc, fieldsCreated: false } });
      }
    }

    await createAuditLog({
      user: req.user?._id,
      document: doc._id.toString(),
      action: 'document_created',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { fromTemplate: id }
    });

    res.status(201).json({ success: true, data: { document: doc } });
  })
};
