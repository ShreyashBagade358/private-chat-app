import React, { useState } from 'react';
import '../styles/SessionEntry.css';

function SessionEntry({ onCreateSession, onJoinSession, loading, connected, createdSessionCode }) {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    onJoinSession(joinCode);
  };

  const handleCopyCode = () => {
    if (createdSessionCode) {
      navigator.clipboard.writeText(createdSessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinCodeChange = (e) => {
    // Only allow numbers and limit to 10 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setJoinCode(value);
  };

  return (
    <div className="session-entry">
      {createdSessionCode ? (
        <div className="session-created-view">
          <div className="welcome-icon">🔒</div>
          <h2>Session Created!</h2>
          <p className="session-code-label">Share this code with your chat partner:</p>
          
          <div className="session-code-display">
            <code className="session-code">{createdSessionCode}</code>
            <button 
              className="copy-btn"
              onClick={handleCopyCode}
              title="Copy to clipboard"
            >
              {copied ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="session-code-instructions">
            <p>Waiting for your chat partner to join...</p>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div className="features-list" style={{marginTop: '2rem'}}>
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
          </div>
        </div>
      ) : (
        <>
          <div className="session-welcome">
            <div className="welcome-icon">🔒</div>
            <h2>Welcome to Private Chat</h2>
            <p>Create a new session or join an existing one to start chatting securely</p>
          </div>

          <div className="session-options">
        <div className="option-card">
          <div className="card-header">
            <div className="card-icon create-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3>Create New Session</h3>
          </div>
          <p className="card-description">
            Start a new private chat session and share the code with your contact
          </p>
          <button
            onClick={onCreateSession}
            disabled={!connected || loading}
            className="btn btn-primary btn-large"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 4v16m8-8H4" />
                </svg>
                Create Session
              </>
            )}
          </button>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="option-card">
          <div className="card-header">
            <div className="card-icon join-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3>Join Existing Session</h3>
          </div>
          <p className="card-description">
            Enter the 10-digit session code shared with you
          </p>
          <form onSubmit={handleJoinSubmit} className="join-form">
            <div className="input-group">
              <input
                type="text"
                value={joinCode}
                onChange={handleJoinCodeChange}
                placeholder="Enter 10-digit code"
                maxLength={10}
                className="session-code-input"
                disabled={!connected || loading}
              />
              <div className="input-hint">
                {joinCode.length}/10 digits
              </div>
            </div>
            <button
              type="submit"
              disabled={!connected || loading || joinCode.length !== 10}
              className="btn btn-primary btn-large"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Joining...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Join Session
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {!connected && (
        <div className="connection-warning">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>Connecting to server...</span>
        </div>
      )}

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
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span>Text, media & voice/video calls</span>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default SessionEntry;