import fs from 'fs/promises';
import path from 'path';
import { Document } from '../models';
import { PDFDocument } from 'pdf-lib';

export const migrateExistingDocuments = async () => {
  try {
    console.log('Starting migration of existing documents...');
    
    // Find all documents that don't have pdfContent
    const documentsWithoutContent = await Document.find({ 
      pdfContent: { $exists: false } 
    });
    
    console.log(`Found ${documentsWithoutContent.length} documents to migrate`);
    
    for (const doc of documentsWithoutContent) {
      try {
        if (doc.filePath) {
          // Read the file from disk
          const pdfBytes = await fs.readFile(doc.filePath);
          
          // Convert to base64
          const pdfContent = pdfBytes.toString('base64');
          
          // Update the document
          await Document.findByIdAndUpdate(doc._id, { 
            pdfContent 
          });
          
          console.log(`Migrated document: ${doc.title} (${doc._id})`);
        }
      } catch (error) {
        console.error(`Failed to migrate document ${doc._id}:`, error);
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};
