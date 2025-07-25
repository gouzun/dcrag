import * as admin from 'firebase-admin';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { processText } from './textProcessor';

interface FileProcessResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  fileType: string;
  extractedTextLength: number;
  storagePath: string;
  metadata: Record<string, unknown>;
}

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export async function processFile(file: FileUpload, userId: string): Promise<FileProcessResult> {
  try {
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    let extractedText = '';
    const fileType = file.mimetype;

    // Extract text based on file type
    switch (fileType) {
      case 'application/pdf':
        extractedText = await extractPdfText(file.buffer);
        break;
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        extractedText = await extractDocText(file.buffer);
        break;
      
      case 'text/plain':
        extractedText = file.buffer.toString('utf-8');
        break;
      
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
        // For images, you might want to use OCR or image analysis
        // For now, we'll create a placeholder
        extractedText = `Image file: ${file.originalname}. Content analysis not yet implemented for images.`;
        break;
      
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error('No meaningful text content found in the file');
    }

    // Store file metadata in Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `${userId}/${Date.now()}_${file.originalname}`;
    const fileRef = bucket.file(fileName);
    
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedBy: userId,
          uploadTime: new Date().toISOString(),
        },
      },
    });

    // Process the extracted text using the text processor
    const textResult = await processText(extractedText, userId);

    // Update documents with file-specific metadata
    const db = admin.firestore();
    const knowledgeBaseRef = db.collection('knowledge_base');
    
    // Find documents created by processText and update them
    const recentDocs = await knowledgeBaseRef
      .where('metadata.userId', '==', userId)
      .where('metadata.timestamp', '>=', Date.now() - 60000) // Last minute
      .get();

    const batch = db.batch();
    recentDocs.docs.forEach(doc => {
      const data = doc.data();
      if (data.metadata.type === 'text') {
        batch.update(doc.ref, {
          'metadata.type': 'file',
          'metadata.source': file.originalname,
          'metadata.fileType': file.mimetype,
          'metadata.fileSize': file.size,
          'metadata.storagePath': fileName,
        });
      }
    });
    
    await batch.commit();

    return {
      success: true,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      extractedTextLength: extractedText.length,
      storagePath: fileName,
      metadata: {
        ...textResult.metadata,
        type: 'file',
        originalFileName: file.originalname,
      },
    };
  } catch (error) {
    console.error('File processing error:', error);
    throw error;
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

async function extractDocText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOC extraction error:', error);
    throw new Error('Failed to extract text from document');
  }
} 