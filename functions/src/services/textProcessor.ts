import * as admin from 'firebase-admin';
import { embed } from '@genkit-ai/ai/embedder';
import { textEmbeddingGecko001 } from '@genkit-ai/googleai';

interface TextProcessResult {
  success: boolean;
  documentsCreated: number;
  totalWords: number;
  metadata: Record<string, unknown>;
}

interface ProcessedDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    type: string;
    source: string;
    timestamp: number;
    userId: string;
    wordCount: number;
  };
}

export async function processText(text: string, userId: string): Promise<TextProcessResult> {
  try {
    // Clean and validate text
    const cleanText = text.trim();
    if (cleanText.length < 10) {
      throw new Error('Text must be at least 10 characters long');
    }

    // Split text into chunks if it's too long (max 8000 chars per chunk)
    const chunks = splitTextIntoChunks(cleanText, 8000);
    const db = admin.firestore();
    const batch = db.batch();
    const processedDocuments: ProcessedDocument[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding using Google AI
      const embedding = await embed({
        embedder: textEmbeddingGecko001,
        content: chunk,
      });

      // Create document
      const docId = `${userId}_text_${Date.now()}_${i}`;
      const document: ProcessedDocument = {
        id: docId,
        content: chunk,
        embedding: embedding,
        metadata: {
          type: 'text',
          source: 'user_input',
          timestamp: Date.now(),
          userId,
          wordCount: chunk.split(' ').length,
        },
      };

      // Store in Firestore
      const docRef = db.collection('knowledge_base').doc(docId);
      batch.set(docRef, document);
      processedDocuments.push(document);
    }

    // Commit batch
    await batch.commit();

    return {
      success: true,
      documentsCreated: processedDocuments.length,
      totalWords: cleanText.split(' ').length,
      metadata: {
        type: 'text',
        chunksCreated: chunks.length,
        processingTime: Date.now(),
      },
    };
  } catch (error) {
    console.error('Text processing error:', error);
    throw error;
  }
}

function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        // If single sentence is too long, split by words
        const words = trimmedSentence.split(' ');
        let wordChunk = '';
        for (const word of words) {
          if (wordChunk.length + word.length + 1 > maxChunkSize) {
            if (wordChunk.length > 0) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              chunks.push(word); // Single word longer than chunk size
            }
          } else {
            wordChunk += (wordChunk.length > 0 ? ' ' : '') + word;
          }
        }
        if (wordChunk.length > 0) {
          chunks.push(wordChunk.trim());
        }
        currentChunk = '';
      }
    } else {
      currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
} 