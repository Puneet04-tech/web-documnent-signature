import { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, PDFPage, PDFFont, StandardFonts, RGB, rgb, degrees } from 'pdf-lib';
import { Document, SignatureField, Signature, User } from '../models';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';
import { config } from '../config';

// Helper to convert data URL to bytes
function dataURLToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const bytes = Buffer.from(base64, 'base64');
  return new Uint8Array(bytes);
}

// Generate signed PDF with embedded signature fields
export async function generateSignedPDF(documentId: string): Promise<string> {
  const document = await Document.findById(documentId);
  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Get all signature fields for this document
  const fields = await SignatureField.find({ document: documentId }).sort({ page: 1 });
  console.log(`Found ${fields.length} fields for document ${documentId}`);
  
  // Load original PDF
  const originalPath = path.join(__dirname, '..', '..', document.filePath);
  const pdfBytes = await fs.readFile(originalPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  console.log(`PDF has ${pages.length} pages`);

  // Embed each field into the PDF
  for (const field of fields) {
    console.log(`Processing field: ${field.type} on page ${field.page}, value exists: ${!!field.value}`);
    
    if (field.page > pages.length || !field.value) {
      console.log(`Skipping field - page ${field.page} > ${pages.length} or no value`);
      continue;
    }
    
    const page = pages[field.page - 1];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    console.log(`Page ${field.page} size: ${pageWidth}x${pageHeight}`);
    
    // Coordinates are now normalized to PDF scale (1.0) by frontend
    // No need to apply scale factor, use coordinates directly
    const pdfX = field.x;
    const pdfY = pageHeight - field.y - field.height;
    
    console.log(`Drawing ${field.type} at PDF coords: x=${pdfX}, y=${pdfY}, w=${field.width}, h=${field.height}`);

    if (field.type === 'signature' || field.type === 'initials') {
      // Handle image signatures
      if (field.value.startsWith('data:image')) {
        try {
          const imageBytes = dataURLToBytes(field.value);
          const embeddedImage = await pdfDoc.embedPng(imageBytes);
          
          console.log('Embedding PNG signature image');
          page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: field.width,
            height: field.height,
          });
          console.log('Image drawn successfully');
        } catch (err) {
          console.error('Error embedding signature image:', err);
          // Fallback to text
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          page.drawText(field.value.substring(0, 20), {
            x: pdfX,
            y: pdfY + field.height / 2,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
        }
      } else {
        // Text signature/initials
        const font = await pdfDoc.embedFont(StandardFonts.Courier);
        const isInitials = field.type === 'initials';
        page.drawText(field.value, {
          x: pdfX,
          y: pdfY + field.height / 2 - (isInitials ? 5 : 0),
          size: isInitials ? 16 : 12,
          font,
          color: rgb(0, 0, 0),
        });
      }
    } else if (field.type === 'name' || field.type === 'text' || field.type === 'input') {
      // Text fields
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(field.value, {
        x: pdfX + 2,
        y: pdfY + field.height / 2 - 4,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    } else if (field.type === 'witness') {
      // Witness field - similar to signature but with different styling
      if (field.value.startsWith('data:image')) {
        try {
          const imageBytes = Buffer.from(field.value.split(',')[1], 'base64');
          const image = await pdfDoc.embedPng(imageBytes);
          page.drawImage(image, {
            x: pdfX,
            y: pdfY,
            width: field.width,
            height: field.height,
          });
          console.log('Witness signature image drawn successfully');
        } catch (err) {
          console.error('Error embedding witness signature image:', err);
          // Fallback to text
          const font = await pdfDoc.embedFont(StandardFonts.Courier);
          page.drawText(`Witness: ${field.value.substring(0, 20)}`, {
            x: pdfX,
            y: pdfY + field.height / 2,
            size: 10,
            font,
            color: rgb(0, 0, 0.5),
          });
        }
      } else {
        // Text witness signature
        const font = await pdfDoc.embedFont(StandardFonts.Courier);
        page.drawText(`Witness: ${field.value}`, {
          x: pdfX,
          y: pdfY + field.height / 2,
          size: 12,
          font,
          color: rgb(0, 0, 0.5),
        });
      }
    } else if (field.type === 'date') {
      // Date field
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(field.value, {
        x: pdfX + 2,
        y: pdfY + field.height / 2 - 4,
        size: 10,
        font,
        color: rgb(0, 0, 0.5),
      });
    } else if (field.type === 'checkbox' && field.value === 'checked') {
      // Checkbox - draw checkmark
      const font = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);
      page.drawText('✓', {
        x: pdfX + 8,
        y: pdfY + 5,
        size: 14,
        font,
        color: rgb(0, 0.5, 0),
      });
    }
  }

  // Save signed PDF
  const signedPdfBytes = await pdfDoc.save();
  const signedFileName = `signed_${document.fileName}`;
  const signedFilePath = path.join('uploads', 'signed', signedFileName);
  const fullSignedPath = path.join(__dirname, '..', '..', signedFilePath);

  // Ensure signed directory exists
  const signedDir = path.dirname(fullSignedPath);
  try {
    await fs.mkdir(signedDir, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }

  await fs.writeFile(fullSignedPath, signedPdfBytes);

  // Update document
  document.signedFilePath = signedFilePath;
  document.status = 'completed';
  await document.save();

  return signedFilePath;
}

// Controller for finalizing document
export const finalizeController = {
  finalize: asyncHandler(async (req: AuthRequest, res: Response) => {
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

    // Get all fields and check if required ones are filled
    const fields = await SignatureField.find({ document: id });
    const requiredFields = fields.filter(f => f.required);
    const unfilledRequired = requiredFields.filter(f => !f.value);

    if (unfilledRequired.length > 0) {
      throw new AppError(
        `${unfilledRequired.length} required field(s) not filled. Please fill all required fields before finalizing.`,
        400
      );
    }

    // Generate signed PDF
    const signedFilePath = await generateSignedPDF(id);

    // Update document status
    document.status = 'completed';
    await document.save();

    await createAuditLog({
      user: userId,
      document: id,
      action: 'document_finalized',
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { 
        fieldsCount: fields.length,
        signedFilePath 
      }
    });

    res.json({
      success: true,
      message: 'Document finalized successfully',
      data: { 
        document,
        signedFilePath,
        fieldsEmbedded: fields.length
      }
    });
  }),

  // Preview signed PDF (generate without saving)
  preview: asyncHandler(async (req: AuthRequest, res: Response) => {
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

    // Get all signature fields for this document
    const fields = await SignatureField.find({ document: id }).sort({ page: 1 });
    
    // Load original PDF
    const originalPath = path.join(__dirname, '..', '..', document.filePath);
    const pdfBytes = await fs.readFile(originalPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Embed each field into the PDF
    for (const field of fields) {
      if (field.page > pages.length || !field.value) continue;
      
      const page = pages[field.page - 1];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      const pdfX = field.x;
      const pdfY = pageHeight - field.y - field.height;

      if (field.type === 'signature' || field.type === 'initials') {
        if (field.value.startsWith('data:image')) {
          try {
            const imageBytes = dataURLToBytes(field.value);
            const embeddedImage = await pdfDoc.embedPng(imageBytes);
            
            page.drawImage(embeddedImage, {
              x: pdfX,
              y: pdfY,
              width: field.width,
              height: field.height,
            });
          } catch (err) {
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            page.drawText(field.value.substring(0, 20), {
              x: pdfX,
              y: pdfY + field.height / 2,
              size: 12,
              font,
              color: rgb(0, 0, 0),
            });
          }
        } else {
          const font = await pdfDoc.embedFont(StandardFonts.Courier);
          const isInitials = field.type === 'initials';
          page.drawText(field.value, {
            x: pdfX,
            y: pdfY + field.height / 2 - (isInitials ? 5 : 0),
            size: isInitials ? 16 : 12,
            font,
            color: rgb(0, 0, 0),
          });
        }
      } else if (field.type === 'name' || field.type === 'text' || field.type === 'input') {
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(field.value, {
          x: pdfX + 2,
          y: pdfY + field.height / 2 - 4,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
      } else if (field.type === 'date') {
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(field.value, {
          x: pdfX + 2,
          y: pdfY + field.height / 2 - 4,
          size: 10,
          font,
          color: rgb(0, 0, 0.5),
        });
      } else if (field.type === 'checkbox' && field.value === 'checked') {
        const font = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);
        page.drawText('✓', {
          x: pdfX + 8,
          y: pdfY + 5,
          size: 14,
          font,
          color: rgb(0, 0.5, 0),
        });
      }
    }

    const signedPdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview_${document.originalName}"`);
    res.send(Buffer.from(signedPdfBytes));
  })
};
