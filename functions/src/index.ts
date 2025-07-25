import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { processFile } from './services/fileProcessor';
import { processText } from './services/textProcessor';
import { processUrl } from './services/urlProcessor';
import { queryRAG } from './services/ragService';

// Initialize Firebase Admin
admin.initializeApp();

// Configure Genkit
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
  ],
});

// Create Express app
const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || true;
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '10mb' }));

// Configure Multer for file uploads
const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

// Authentication middleware
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid authentication token' 
    });
  }
};

// API Routes with versioning
const apiV1 = express.Router();

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  return res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Text processing endpoint
apiV1.post('/process-text', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Text is required and must be a string' 
      });
    }

    const result = await processText(text, req.user!.uid);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Text processing error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process text' 
    });
  }
});

// File processing endpoint
apiV1.post('/process-file', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'File is required' 
      });
    }

    const result = await processFile(req.file, req.user!.uid);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('File processing error:', error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ 
        error: 'File Upload Error',
        message: error.message 
      });
    }
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process file' 
    });
  }
});

// URL processing endpoint
apiV1.post('/process-url', requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'URL is required and must be a string' 
      });
    }

    const result = await processUrl(url, req.user!.uid);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('URL processing error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process URL' 
    });
  }
});

// RAG query endpoint
apiV1.post('/query', requireAuth, async (req, res) => {
  try {
    const { query, conversationHistory } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Query is required and must be a string' 
      });
    }

    const result = await queryRAG(query, conversationHistory || [], req.user!.uid);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('RAG query error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process query' 
    });
  }
});

// Mount API routes
app.use('/v1', apiV1);
// For backward compatibility, also mount on root
app.use('/', apiV1);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'API endpoint not found' 
  });
});

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest({
  timeoutSeconds: 540,
  memory: '2GiB',
}, app);

// Extend Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    user?: admin.auth.DecodedIdToken;
  }
} 