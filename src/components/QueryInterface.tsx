import React, { useState, useRef, useEffect } from 'react';
import './QueryInterface.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
}

interface Source {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'file' | 'url';
  similarity?: number;
}

const QueryInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmitQuery = async () => {
    if (!currentQuery.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentQuery,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentQuery('');
    setIsLoading(true);

    try {
      const { queryRAG } = await import('../utils/api');
      const result = await queryRAG(currentQuery, messages.slice(-10));
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        sources: result.sources || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error submitting query:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuery();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowSources(null);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const exampleQueries = [
    "What are the key points from the uploaded documents?",
    "Summarize the main findings from the research papers",
    "What does the documentation say about implementation?",
    "Can you explain the methodology described in the files?"
  ];

  return (
    <div className="query-interface">
      <div className="chat-section">
        <div className="chat-header">
          <div className="header-content">
            <h2>RAG Assistant</h2>
            <p>Ask questions about your uploaded knowledge base</p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="clear-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
              </svg>
              Clear Chat
            </button>
          )}
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3>Start a conversation</h3>
              <p>Ask questions about your uploaded documents and knowledge base.</p>
              
              <div className="example-queries">
                <h4>Try asking:</h4>
                <div className="example-list">
                  {exampleQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuery(query)}
                      className="example-query"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map(message => (
                <div key={message.id} className={`message ${message.type}`}>
                  <div className="message-avatar">
                    {message.type === 'user' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                      </svg>
                    )}
                  </div>
                  <div className="message-content">
                    <div className="message-text">
                      {message.content}
                    </div>
                    <div className="message-meta">
                      <span className="message-time">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.sources && message.sources.length > 0 && (
                        <button
                          onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                          className="sources-btn"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                          {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    
                    {showSources === message.id && message.sources && (
                      <div className="sources-panel">
                        <h4>Sources</h4>
                        <div className="sources-list">
                          {message.sources.map(source => (
                            <div key={source.id} className="source-item">
                              <div className="source-header">
                                <div className="source-type">
                                  {source.type === 'text' ? '📝' : source.type === 'file' ? '📎' : '🌐'}
                                </div>
                                <div className="source-info">
                                  <span className="source-title">{source.title}</span>
                                  {source.similarity && (
                                    <span className="source-similarity">
                                      {Math.round(source.similarity * 100)}% match
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="source-content">
                                {source.content.length > 200 
                                  ? `${source.content.substring(0, 200)}...` 
                                  : source.content
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-avatar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                    </svg>
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your knowledge base..."
              className="query-textarea"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSubmitQuery}
              disabled={!currentQuery.trim() || isLoading}
              className="send-btn"
            >
              {isLoading ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                </svg>
              )}
            </button>
          </div>
          <div className="input-hint">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryInterface; 