import React, { useState, useRef } from 'react';
import './DataInput.css';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
}

interface ProcessedData {
  id: string;
  type: 'text' | 'file' | 'url';
  content: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

const DataInput: React.FC = () => {
  const [activeInputType, setActiveInputType] = useState<'text' | 'file' | 'url'>('text');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    
    setIsProcessing(true);
    try {
      const { processText } = await import('../utils/api');
      const result = await processText(textInput);
      
      const newData: ProcessedData = {
        id: Date.now().toString(),
        type: 'text',
        content: textInput,
        metadata: result.metadata,
        timestamp: new Date()
      };
      setProcessedData(prev => [newData, ...prev]);
      setTextInput('');
    } catch (error) {
      console.error('Error processing text:', error);
      alert('Error processing text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    
    setIsProcessing(true);
    try {
      const { processUrl } = await import('../utils/api');
      const result = await processUrl(urlInput);
      
      const newData: ProcessedData = {
        id: Date.now().toString(),
        type: 'url',
        content: urlInput,
        metadata: result.metadata,
        timestamp: new Date()
      };
      setProcessedData(prev => [newData, ...prev]);
      setUrlInput('');
    } catch (error) {
      console.error('Error processing URL:', error);
      alert('Error processing URL. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      const uploadFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        file,
        progress: 0,
        status: 'pending'
      };
      
      setUploadedFiles(prev => [...prev, uploadFile]);
      processFile(uploadFile);
    });
  };

  const processFile = async (uploadFile: UploadedFile) => {
    setUploadedFiles(prev => 
      prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
    );

    try {
      const { processFile: apiProcessFile } = await import('../utils/api');
      const result = await apiProcessFile(uploadFile.file);
      
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100 } : f)
      );

      const newData: ProcessedData = {
        id: uploadFile.id,
        type: 'file',
        content: uploadFile.name,
        metadata: { ...result.metadata, fileSize: uploadFile.size, fileType: uploadFile.type },
        timestamp: new Date()
      };
      setProcessedData(prev => [newData, ...prev]);
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { ...f, status: 'error' } : f)
      );
      alert('Error processing file. Please try again.');
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeProcessedData = (dataId: string) => {
    setProcessedData(prev => prev.filter(d => d.id !== dataId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="data-input">
      <div className="input-section">
        <div className="section-header">
          <h2>Add Knowledge to Your RAG System</h2>
          <p>Upload documents, add text, or provide website links to build your knowledge base.</p>
        </div>

        {/* Input Type Selector */}
        <div className="input-type-selector">
          <button 
            className={`type-btn ${activeInputType === 'text' ? 'active' : ''}`}
            onClick={() => setActiveInputType('text')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Text Input
          </button>
          <button 
            className={`type-btn ${activeInputType === 'file' ? 'active' : ''}`}
            onClick={() => setActiveInputType('file')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            File Upload
          </button>
          <button 
            className={`type-btn ${activeInputType === 'url' ? 'active' : ''}`}
            onClick={() => setActiveInputType('url')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Website URL
          </button>
        </div>

        {/* Text Input */}
        {activeInputType === 'text' && (
          <div className="input-form">
            <div className="form-group">
              <label htmlFor="text-input">Enter your text content</label>
              <textarea
                id="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your text here... This could be articles, notes, documentation, or any text content you want to add to your knowledge base."
                rows={8}
                className="text-area"
              />
            </div>
            <button 
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isProcessing}
              className="submit-btn"
            >
              {isProcessing ? 'Processing...' : 'Add Text to Knowledge Base'}
            </button>
          </div>
        )}

        {/* File Upload */}
        {activeInputType === 'file' && (
          <div className="input-form">
            <div 
              className="file-drop-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  handleFileUpload(files);
                }
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9,15 12,12 15,15"/>
              </svg>
              <h3>Drop files here or click to upload</h3>
              <p>Supports PDF, DOC, TXT, Images, and more</p>
              <p className="file-limit">Max file size: 10MB per file</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files);
                }
              }}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* URL Input */}
        {activeInputType === 'url' && (
          <div className="input-form">
            <div className="form-group">
              <label htmlFor="url-input">Website URL</label>
              <input
                id="url-input"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                className="url-input"
              />
              <p className="input-hint">
                Enter a website URL to extract and add its content to your knowledge base.
              </p>
            </div>
            <button 
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || isProcessing}
              className="submit-btn"
            >
              {isProcessing ? 'Processing...' : 'Extract Website Content'}
            </button>
          </div>
        )}
      </div>

      {/* Uploaded Files Section */}
      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <h3>Uploaded Files</h3>
          <div className="file-list">
            {uploadedFiles.map(file => (
              <div key={file.id} className={`file-item ${file.status}`}>
                <div className="file-info">
                  <div className="file-icon">
                    {file.type.startsWith('image/') ? '🖼️' : 
                     file.type.includes('pdf') ? '📄' : 
                     file.type.includes('document') ? '📝' : '📎'}
                  </div>
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <span className={`status-badge ${file.status}`}>
                    {file.status}
                  </span>
                  <button 
                    onClick={() => removeFile(file.id)}
                    className="remove-btn"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Data Section */}
      {processedData.length > 0 && (
        <div className="processed-data">
          <h3>Knowledge Base Entries</h3>
          <div className="data-list">
            {processedData.map(data => (
              <div key={data.id} className="data-item">
                <div className="data-info">
                  <div className="data-type">
                    {data.type === 'text' ? '📝' : data.type === 'file' ? '📎' : '🌐'}
                  </div>
                  <div className="data-details">
                    <span className="data-content">{data.content}</span>
                    <span className="data-timestamp">
                      Added {data.timestamp.toLocaleString()}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => removeProcessedData(data.id)}
                  className="remove-btn"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataInput; 