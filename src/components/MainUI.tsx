import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import DataInput from './DataInput';
import QueryInterface from './QueryInterface';
import './MainUI.css';

interface MainUIProps {
  user: User;
  onLogout: () => void;
}

type ActiveTab = 'upload' | 'query';

const MainUI: React.FC<MainUIProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');

  return (
    <div className="main-ui">
      {/* Header */}
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">DCRAG</h1>
            <span className="app-subtitle">AI-Powered Knowledge System</span>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-details">
                <span className="user-name">{user.displayName || 'User'}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
            <button onClick={onLogout} className="logout-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="main-nav">
        <div className="nav-content">
          <button 
            className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Data Input
          </button>
          <button 
            className={`nav-tab ${activeTab === 'query' ? 'active' : ''}`}
            onClick={() => setActiveTab('query')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            Query & Chat
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'upload' && <DataInput />}
        {activeTab === 'query' && <QueryInterface />}
      </main>
    </div>
  );
};

export default MainUI; 