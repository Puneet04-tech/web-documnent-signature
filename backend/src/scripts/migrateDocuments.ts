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
        console.log(`Processing document: ${doc.title} (${doc._id})`);
        console.log(`File path: ${doc.filePath}`);
        
        if (doc.filePath) {
          // Check if file exists
          try {
            await fs.access(doc.filePath);
            console.log('File exists, reading...');
          } catch (accessError) {
            console.log(`File does not exist: ${doc.filePath}`);
            // Try alternative path patterns
            const altPaths = [
              path.join('uploads', path.basename(doc.filePath)),
              path.join('backend', 'uploads', path.basename(doc.filePath)),
              path.join(process.cwd(), 'uploads', path.basename(doc.filePath))
            ];
            
            let foundPath = null;
            for (const altPath of altPaths) {
              try {
                await fs.access(altPath);
                foundPath = altPath;
                console.log(`Found file at: ${foundPath}`);
                break;
              } catch {
                continue;
              }
            }
            
            if (!foundPath) {
              console.log(`No file found for document ${doc._id}, skipping...`);
              continue;
            }
            
            doc.filePath = foundPath;
          }
          
          // Read file from disk
          const pdfBytes = await fs.readFile(doc.filePath);
          console.log(`File read successfully, size: ${pdfBytes.length} bytes`);
          
          // Convert to base64
          const pdfContent = pdfBytes.toString('base64');
          console.log(`Converted to base64, length: ${pdfContent.length}`);
          
          // Update document
          await Document.findByIdAndUpdate(doc._id, { 
            pdfContent 
          });
          
          console.log(` Migrated document: ${doc.title} (${doc._id})`);
        } else {
          console.log(` No file path for document ${doc._id}, skipping...`);
        }
      } catch (error) {
        console.error(` Failed to migrate document ${doc._id}:`, error);
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};
