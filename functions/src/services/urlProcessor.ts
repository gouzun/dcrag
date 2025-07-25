import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { processText } from './textProcessor';

interface UrlProcessResult {
  success: boolean;
  url: string;
  title: string;
  description: string;
  domain: string;
  extractedTextLength: number;
  metadata: Record<string, unknown>;
}

export async function processUrl(url: string, userId: string): Promise<UrlProcessResult> {
  try {
    // Validate URL
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Fetch webpage content
    const response = await axios.get(url, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DCRAG-Bot/1.0)',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
    }

    // Extract text content using Cheerio
    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style, nav, header, footer, aside').remove();
    
    // Extract main content
    let extractedText = '';
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '.container',
    ];
    
    let mainContent = '';
    for (const selector of contentSelectors) {
      const content = $(selector).first();
      if (content.length > 0) {
        mainContent = content.text();
        break;
      }
    }
    
    // If no main content found, extract from body
    if (!mainContent) {
      mainContent = $('body').text();
    }
    
    // Clean and structure the text
    extractedText = cleanExtractedText(mainContent);
    
    // Add title and meta description if available
    if (title) {
      extractedText = `Title: ${title}\n\n${extractedText}`;
    }
    
    if (metaDescription) {
      extractedText = `Description: ${metaDescription}\n\n${extractedText}`;
    }

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error('No meaningful content found on the webpage');
    }

    // Process the extracted text
    const textResult = await processText(extractedText, userId);

    // Update documents with URL-specific metadata
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
          'metadata.type': 'url',
          'metadata.source': url,
          'metadata.title': title,
          'metadata.description': metaDescription,
          'metadata.domain': new URL(url).hostname,
        });
      }
    });
    
    await batch.commit();

    return {
      success: true,
      url,
      title,
      description: metaDescription,
      domain: new URL(url).hostname,
      extractedTextLength: extractedText.length,
      metadata: {
        ...textResult.metadata,
        type: 'url',
        sourceUrl: url,
        title,
      },
    };
  } catch (error) {
    console.error('URL processing error:', error);
    if (error instanceof Error && ('code' in error)) {
      const errorWithCode = error as Error & { code: string };
      if (errorWithCode.code === 'ENOTFOUND' || errorWithCode.code === 'ECONNREFUSED') {
        throw new Error('Unable to reach the provided URL');
      }
    }
    throw error;
  }
}

function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanExtractedText(text: string): string {
  return text
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove multiple newlines
    .replace(/\n+/g, '\n')
    // Remove leading/trailing whitespace
    .trim()
    // Remove common navigation text
    .replace(/\b(home|about|contact|privacy|terms|cookies?|login|register|sign up|sign in)\b/gi, '')
    // Remove email addresses and URLs from text
    .replace(/\S+@\S+\.\S+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    // Clean up remaining artifacts
    .replace(/\s+/g, ' ')
    .trim();
} 