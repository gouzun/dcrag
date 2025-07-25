# DCRAG - AI-Powered Knowledge System

A modern, full-stack RAG (Retrieval-Augmented Generation) application built with React, Firebase, and Google Gemini AI. DCRAG allows users to build their own knowledge base by uploading documents, adding text, or providing website links, then query that knowledge using natural language.

## 🚀 Features

### Authentication
- **Email & Password Login/Signup** with form validation
- **Google Sign-In** integration
- **Secure Firebase Authentication** with protected routes

### Data Input
- **Text Input**: Direct text entry with intelligent chunking
- **File Upload**: Support for PDF, DOC, DOCX, TXT, and images
- **Website URLs**: Automatic web scraping and content extraction
- **Drag & Drop**: Intuitive file upload interface
- **Progress Tracking**: Real-time upload and processing status

### AI-Powered Query System
- **Natural Language Queries**: Ask questions in plain English
- **Context-Aware Responses**: Maintains conversation history
- **Source Attribution**: Shows which documents were used for answers
- **Similarity Scoring**: Displays relevance scores for sources
- **Real-time Chat Interface**: Modern chat experience

### Technical Features
- **Vector Embeddings**: Google Gemini embeddings for semantic search
- **Cosine Similarity**: Efficient document retrieval
- **Chunking Strategy**: Intelligent text segmentation
- **Firebase Storage**: Secure file storage
- **Firestore Database**: Scalable document storage
- **Responsive Design**: Works on desktop and mobile

## 🛠 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Firebase Authentication & Storage**
- **Modern CSS** with responsive design
- **Vite** for fast development

### Backend
- **Firebase Functions** for serverless backend
- **Google Genkit** for AI workflow orchestration
- **Google Gemini AI** for embeddings and generation
- **Express.js** for API routing
- **Multer** for file uploads

### AI/ML
- **Google Gemini 1.5 Flash** for response generation
- **Gemini Embeddings** for vector search
- **Vector Similarity Search** with cosine similarity
- **RAG Architecture** for context-aware responses

## 🏗 Architecture

```
Frontend (React)
    ↓
Firebase Auth
    ↓
Firebase Functions (Express API)
    ↓
Google Genkit + Gemini AI
    ↓
Firestore (Vector Database) + Firebase Storage
```

## 📦 Installation

### Prerequisites
- Node.js 18+
- Firebase CLI
- Google Cloud Project with AI API enabled

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
```bash
cd functions
npm install
npm run build
firebase emulators:start --only functions
```

### Environment Variables

Create `.env` file:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

For Firebase Functions, set:
```bash
firebase functions:config:set gemini.api_key="your_google_ai_api_key"
```

## 🚀 Deployment

### Frontend (Firebase Hosting)
```bash
npm run build
firebase deploy --only hosting
```

### Backend (Firebase Functions)
```bash
cd functions
npm run build
firebase deploy --only functions
```

## 📝 Usage

1. **Sign Up/Login**: Create an account or sign in with Google
2. **Upload Content**: Add documents, text, or website URLs to your knowledge base
3. **Query Your Data**: Ask questions about your uploaded content
4. **Review Sources**: See which documents were used to generate responses
5. **Continue Conversations**: Maintain context across multiple queries

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
│   ├── Login.tsx       # Authentication component
│   ├── MainUI.tsx      # Main application layout
│   ├── DataInput.tsx   # Data upload interface
│   └── QueryInterface.tsx # Chat interface
├── database/           # Firebase configuration
├── utils/             # API utilities
└── styles/            # CSS files

functions/
├── src/
│   ├── services/      # Business logic
│   │   ├── textProcessor.ts
│   │   ├── fileProcessor.ts
│   │   ├── urlProcessor.ts
│   │   └── ragService.ts
│   └── index.ts       # Functions entry point
```

### Key Services

#### Text Processing
- Validates and cleans input text
- Splits text into semantic chunks
- Generates embeddings using Gemini
- Stores in Firestore with metadata

#### File Processing
- Extracts text from PDF, DOC, TXT files
- Stores original files in Firebase Storage
- Processes extracted text through text processor
- Supports multiple file formats

#### URL Processing
- Scrapes web content using Cheerio
- Cleans and extracts main content
- Removes navigation and boilerplate text
- Processes through text pipeline

#### RAG Service
- Generates query embeddings
- Performs vector similarity search
- Retrieves relevant documents
- Generates contextual responses using Gemini

## 🔐 Security

- **Authentication Required**: All API endpoints protected
- **User Isolation**: Each user's data is isolated
- **Token Validation**: Firebase ID tokens verified
- **Input Sanitization**: Text cleaning and validation
- **File Size Limits**: 10MB file upload limit

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on all device sizes
- **Loading States**: Progress indicators throughout
- **Error Handling**: User-friendly error messages
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Dark Mode Ready**: CSS custom properties for theming

## 📊 Performance

- **Efficient Chunking**: Optimized text segmentation
- **Vector Caching**: Embeddings stored for reuse
- **Batch Operations**: Firestore batch writes
- **Similarity Threshold**: Filters low-relevance results
- **Conversation Limits**: Manages context window size

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please create an issue in the GitHub repository or contact the development team.

---

Built with ❤️ using React, Firebase, and Google Gemini AI
