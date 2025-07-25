import * as admin from 'firebase-admin';
import { embed } from '@genkit-ai/ai/embedder';
import { generate } from '@genkit-ai/ai';
import { textEmbeddingGecko001, gemini15Flash } from '@genkit-ai/googleai';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Source {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'file' | 'url';
  similarity: number;
}

interface QueryResult {
  answer: string;
  sources: Source[];
}

interface DocumentWithScore {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function queryRAG(
  query: string, 
  conversationHistory: Message[], 
  userId: string
): Promise<QueryResult> {
  try {
    // Generate embedding for the user query
    const queryEmbedding = await embed({
      embedder: textEmbeddingGecko001,
      content: query,
    });

    // Search for relevant documents using vector similarity
    const relevantDocs = await searchSimilarDocuments(queryEmbedding, userId, 5);

    if (relevantDocs.length === 0) {
      return {
        answer: "I don't have any relevant information in your knowledge base to answer this question. Please upload some documents or add content first.",
        sources: [],
      };
    }

    // Prepare context from retrieved documents
    const context = relevantDocs
      .map((doc, index) => `[Source ${index + 1}]: ${doc.content}`)
      .join('\n\n');

    // Prepare conversation history for context
    const recentHistory = conversationHistory
      .slice(-6) // Last 3 exchanges (6 messages)
      .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Generate response using Gemini
    const prompt = buildRAGPrompt(query, context, recentHistory);
    
    const response = await generate({
      model: gemini15Flash,
      prompt: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topK: 40,
        topP: 0.95,
      },
    });

    // Format sources
    const sources: Source[] = relevantDocs.map(doc => ({
      id: doc.id,
      title: getDocumentTitle(doc),
      content: doc.content.substring(0, 300) + (doc.content.length > 300 ? '...' : ''),
      type: doc.metadata.type as 'text' | 'file' | 'url',
      similarity: doc.similarity || 0,
    }));

    return {
      answer: String(typeof response.text === 'function' ? response.text() : response.text || "I'm sorry, I couldn't generate a response. Please try again."),
      sources,
    };
  } catch (error) {
    console.error('RAG query error:', error);
    throw new Error('Failed to process your query. Please try again.');
  }
}

async function searchSimilarDocuments(
  queryEmbedding: number[], 
  userId: string, 
  limit: number = 5
): Promise<DocumentWithScore[]> {
  const db = admin.firestore();
  
  // Get all user's documents
  const snapshot = await db
    .collection('knowledge_base')
    .where('metadata.userId', '==', userId)
    .get();

  if (snapshot.empty) {
    return [];
  }

  // Calculate similarity scores
  const documentsWithScores = snapshot.docs.map(doc => {
    const data = doc.data();
    const similarity = cosineSimilarity(queryEmbedding, data.embedding);
    
    return {
      id: doc.id,
      content: data.content,
      embedding: data.embedding,
      metadata: data.metadata,
      similarity,
    } as DocumentWithScore;
  });

  // Sort by similarity score and return top results
  return documentsWithScores
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .filter(doc => doc.similarity > 0.3); // Filter out low similarity matches
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

function buildRAGPrompt(query: string, context: string, conversationHistory: string): string {
  return `You are DCRAG, an AI assistant that answers questions based on the user's knowledge base. You have access to the user's uploaded documents, texts, and web content.

INSTRUCTIONS:
1. Answer the user's question using ONLY the information provided in the context below
2. Be accurate and specific - don't make up information not in the context
3. If the context doesn't contain enough information to answer fully, say so
4. Cite which sources you're using when relevant
5. Be conversational and helpful
6. Consider the conversation history for context

CONVERSATION HISTORY:
${conversationHistory}

CONTEXT FROM KNOWLEDGE BASE:
${context}

USER QUESTION: ${query}

RESPONSE:`;
}

function getDocumentTitle(doc: DocumentWithScore): string {
  const metadata = doc.metadata as Record<string, string>;
  
  if (metadata.type === 'file') {
    return (metadata.source as string) || (metadata.originalFileName as string) || 'Uploaded File';
  } else if (metadata.type === 'url') {
    return (metadata.title as string) || (metadata.source as string) || 'Web Page';
  } else if (metadata.type === 'text') {
    // Create a title from the first few words
    const firstWords = doc.content.split(' ').slice(0, 6).join(' ');
    return firstWords.length > 40 ? firstWords.substring(0, 40) + '...' : firstWords;
  }
  
  return 'Knowledge Base Entry';
} 