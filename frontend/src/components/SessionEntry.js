import React, { useState } from 'react';
import '../styles/SessionEntry.css';

function SessionEntry({ onCreateSession, onJoinSession, error }) {
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCode(value);
  };
  
  const handleJoin = () => {
    if (code.length === 10) {
      onJoinSession(code);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && code.length === 10) {
      handleJoin();
    }
  };
  
  return (
    <div className="session-entry">
      <div className="entry-container">
        <div className="logo-section">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="app-title">SecureChat</h1>
          <p className="app-subtitle">Private, encrypted conversations</p>
        </div>
        
        {error && (
          <div className="error-message">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {error}
          </div>
        )}
        
        <div className="action-section">
          {!isJoining ? (
            <>
              <button className="primary-btn create-btn" onClick={onCreateSession}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Session
              </button>
              
              <div className="divider">
                <span>or</span>
              </div>
              
              <button className="secondary-btn" onClick={() => setIsJoining(true)}>
                Join Existing Session
              </button>
            </>
          ) : (
            <div className="join-section">
              <button className="back-btn" onClick={() => setIsJoining(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              
              <div className="code-input-container">
                <label htmlFor="session-code">Enter 10-digit session code</label>
                <input
                  id="session-code"
                  type="text"
                  className="code-input"
                  value={code}
                  onChange={handleCodeChange}
                  onKeyPress={handleKeyPress}
                  placeholder="0000000000"
                  maxLength={10}
                  autoFocus
                />
                <div className="code-progress">
                  {code.length}/10
                </div>
              </div>
              
              <button 
                className="primary-btn join-btn"
                onClick={handleJoin}
                disabled={code.length !== 10}
              >
                Join Session
              </button>
            </div>
          )}
        </div>
        
        <div className="features-list">
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>End-to-end encrypted</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>No registration required</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
            <span>Share media & files</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionEntry;
