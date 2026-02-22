import { Router } from 'express';
import { pdfController } from '../controllers/pdfController';
import { authMiddleware } from '../middleware/auth';
import { migrateExistingDocuments } from '../scripts/migrateDocuments';
import { Document } from '../models';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Authenticated PDF serving routes
router.get('/document/:documentId', authMiddleware, pdfController.servePdfFromMongo);
router.get('/signed/:documentId', authMiddleware, pdfController.serveSignedPdfFromMongo);

// Public PDF serving (for signing portal)
router.get('/public/:documentId', pdfController.servePublicPdfFromMongo);

// Temporary migration route (remove after use)
router.post('/migrate', async (req, res) => {
  try {
    await migrateExistingDocuments();
    res.json({ success: true, message: 'Migration completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Migration failed' });
  }
});

// Match documents with existing files
router.get('/match', async (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir);
    
    // Get all documents
    const documents = await Document.find({}).select('_id fileName originalName title');
    
    // Match documents with files
    const matches = documents.map(doc => {
      const fileExists = files.includes(doc.fileName);
      return {
        documentId: doc._id,
        title: doc.title,
        fileName: doc.fileName,
        originalName: doc.originalName,
        fileExists,
        fileUrl: fileExists ? `${req.protocol}://${req.get('host')}/uploads/${doc.fileName}` : null
      };
    });
    
    res.json({
      success: true,
      data: {
        totalDocuments: documents.length,
        totalFiles: files.length,
        matches,
        filesInUploads: files
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Matching failed', 
      error: error.message 
    });
  }
});

// List files in uploads directory
router.get('/files', async (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    console.log('Checking uploads directory:', uploadsDir);
    
    const files = await fs.readdir(uploadsDir);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        uploadsDir,
        files: fileStats,
        count: files.length
      }
    });
  } catch (error: any) {
    console.error('Error listing uploads:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to list files', 
      error: error.message 
    });
  }
});

// Fallback: Serve PDF directly from file system
router.get('/file/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('uploads', filename);
    
    console.log('PDF file request:', {
      filename,
      filePath,
      cwd: process.cwd(),
      uploadsPath: path.join(process.cwd(), 'uploads')
    });
    
    // Check if file exists
    try {
      await fs.access(filePath);
      console.log('File exists, reading...');
    } catch (error) {
      console.log('File does not exist:', filePath);
      return res.status(404).json({ 
        success: false, 
        message: 'File not found',
        debug: {
          filename,
          filePath,
          cwd: process.cwd(),
          uploadsPath: path.join(process.cwd(), 'uploads')
        }
      });
    }
    
    // Read file
    const fileBuffer = await fs.readFile(filePath);
    console.log('File read successfully, size:', fileBuffer.length);
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Send file
    res.send(fileBuffer);
  } catch (error: any) {
    console.error('File serving error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'File serving failed', 
      error: error.message 
    });
  }
});

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PDF routes are working',
    timestamp: new Date().toISOString()
  });
});

// List all documents endpoint
router.get('/list', async (req, res) => {
  try {
    const documents = await Document.find({}).select('_id title originalName hasPdfContent pdfContentLength');
    const docList = documents.map(doc => ({
      _id: doc._id,
      title: doc.title,
      originalName: doc.originalName,
      hasPdfContent: !!doc.pdfContent,
      pdfContentLength: doc.pdfContent?.length || 0
    }));
    
    res.json({
      success: true,
      data: docList,
      count: docList.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'List failed', error: error.message });
  }
});

// Debug endpoint to check document content
router.get('/debug/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    res.json({
      success: true,
      data: {
        _id: document._id,
        title: document.title,
        originalName: document.originalName,
        filePath: document.filePath,
        hasPdfContent: !!document.pdfContent,
        pdfContentLength: document.pdfContent?.length || 0,
        fileSize: document.fileSize
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Debug failed', error: error.message });
  }
});

export default router;
