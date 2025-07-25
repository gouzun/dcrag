import { auth } from '../database/firebase';

// Type definitions
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

interface TextProcessResult {
  success: boolean;
  documentsCreated: number;
  totalWords: number;
  metadata: Record<string, unknown>;
}

interface FileProcessResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  fileType: string;
  extractedTextLength: number;
  storagePath: string;
  metadata: Record<string, unknown>;
}

interface UrlProcessResult {
  success: boolean;
  url: string;
  title: string;
  description: string;
  domain: string;
  extractedTextLength: number;
  metadata: Record<string, unknown>;
}

interface QueryResult {
  answer: string;
  sources: Source[];
}

interface HealthResult {
  status: string;
  timestamp: string;
  version: string;
}

// Get the API base URL from environment or use defaults
const getApiBaseUrl = (): string => {
  // For production, use your actual Firebase Functions URL
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL || 'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api';
  }
  
  // For development, use Firebase emulator
  return import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/YOUR_PROJECT_ID/YOUR_REGION/api';
};

const API_BASE_URL = getApiBaseUrl();

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
}

async function makeAuthenticatedRequest(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      error: 'Unknown Error',
      message: 'Failed to parse error response' 
    }));
    throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  // Handle new response format with { success: true, data: ... }
  return data.success ? data.data : data;
}

export async function processText(text: string): Promise<TextProcessResult> {
  const response = await makeAuthenticatedRequest('/process-text', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

  return handleApiResponse<TextProcessResult>(response);
}

export async function processFile(file: File): Promise<FileProcessResult> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/process-file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type for FormData, let browser set it
    },
    body: formData,
  });

  return handleApiResponse<FileProcessResult>(response);
}

export async function processUrl(url: string): Promise<UrlProcessResult> {
  const response = await makeAuthenticatedRequest('/process-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });

  return handleApiResponse<UrlProcessResult>(response);
}

export async function queryRAG(query: string, conversationHistory: Message[] = []): Promise<QueryResult> {
  const response = await makeAuthenticatedRequest('/query', {
    method: 'POST',
    body: JSON.stringify({ query, conversationHistory }),
  });

  return handleApiResponse<QueryResult>(response);
}

// Health check function (no auth required)
export async function healthCheck(): Promise<HealthResult> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return handleApiResponse<HealthResult>(response);
} 