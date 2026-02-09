import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import ChatRoom from './components/ChatRoom';
import SessionEntry from './components/SessionEntry';
import './App.css';

// ✅ CRITICAL: Use environment variable for backend URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

console.log('🔗 Backend URL:', BACKEND_URL);

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    console.log('Initializing socket connection to:', BACKEND_URL);
    
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to server!', newSocket.id);
      setConnected(true);
      setError('');
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      setConnected(false);
      setError(`Cannot connect to server: ${err.message}`);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      setConnected(true);
      setError('');
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      setError('Failed to reconnect to server. Please refresh the page.');
    });

    // Session events
    newSocket.on('session-created', ({ sessionCode }) => {
      console.log('Session created:', sessionCode);
      setSessionCode(sessionCode);
      setUserCount(1);
      setMessages([]);
      setError('');
      setLoading(false);
    });

    newSocket.on('join-error', ({ message }) => {
      console.error('Join error:', message);
      setError(message);
      setSessionCode('');
      setLoading(false);
    });

    newSocket.on('user-joined', ({ users, socketId }) => {
      console.log('User joined. Total users:', users);
      setUserCount(users);
      setMessages(prev => [...prev, {
        type: 'system',
        text: 'User joined the session',
        timestamp: Date.now()
      }]);
    });

    newSocket.on('user-left', () => {
      console.log('User left the session');
      setUserCount(1);
      setMessages(prev => [...prev, {
        type: 'system',
        text: 'User left the session',
        timestamp: Date.now()
      }]);
    });

    // Message events
    newSocket.on('receive-message', ({ message, sender, timestamp }) => {
      console.log('Message received:', message);
      setMessages(prev => [...prev, {
        type: 'received',
        text: message,
        sender,
        timestamp
      }]);
    });

    // Media events
    newSocket.on('receive-media', ({ mediaData, mediaType, fileName, fileSize, sender, timestamp }) => {
      console.log('Media received:', mediaType, fileName);
      setMessages(prev => [...prev, {
        type: 'received',
        mediaData,
        mediaType,
        fileName,
        fileSize,
        sender,
        timestamp
      }]);
    });

    // Session expired
    newSocket.on('session-expired', () => {
      console.log('Session expired');
      setError('Session expired due to inactivity');
      setSessionCode('');
      setMessages([]);
      setUserCount(1);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection...');
      newSocket.close();
    };
  }, []);

  // Create new session
  const handleCreateSession = () => {
    if (!socket || !connected) {
      setError('Not connected to server. Please wait...');
      return;
    }
    
    setLoading(true);
    setError('');
    socket.emit('create-session');
  };

  // Join existing session
  const handleJoinSession = (code) => {
    if (!socket || !connected) {
      setError('Not connected to server. Please wait...');
      return;
    }
    
    if (!code || code.trim().length !== 10) {
      setError('Please enter a valid 10-digit session code');
      return;
    }
    
    setLoading(true);
    setError('');
    socket.emit('join-session', { sessionCode: code });
  };

  // Send text message
  const handleSendMessage = (message) => {
    if (!socket || !sessionCode || !message.trim()) return;
    
    // Send to other user
    socket.emit('send-message', { message });
    
    // Add to own messages
    setMessages(prev => [...prev, {
      type: 'sent',
      text: message,
      timestamp: Date.now()
    }]);
  };

  // Send media (images, videos, files)
  const handleSendMedia = (mediaData, mediaType, fileName, fileSize) => {
    if (!socket || !sessionCode) return;
    
    // Send to other user
    socket.emit('send-media', { mediaData, mediaType, fileName, fileSize });
    
    // Add to own messages
    setMessages(prev => [...prev, {
      type: 'sent',
      mediaData,
      mediaType,
      fileName,
      fileSize,
      timestamp: Date.now()
    }]);
  };

  // Handle typing indicator
  const handleTyping = (isTyping) => {
    if (!socket || !sessionCode) return;
    
    socket.emit('typing', { isTyping });
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 2 seconds of inactivity
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { isTyping: false });
      }, 2000);
    }
  };

  // Leave session
  const handleLeaveSession = () => {
    if (socket && sessionCode) {
      socket.disconnect();
      socket.connect();
    }
    setSessionCode('');
    setMessages([]);
    setUserCount(1);
    setError('');
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>🔒 Private Chat App</h1>
        <div className="connection-status">
          {connected ? (
            <span className="status-badge status-connected">
              <span className="status-dot"></span>
              Connected
            </span>
          ) : (
            <span className="status-badge status-disconnected">
              <span className="status-dot"></span>
              Connecting...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{error}</span>
            <button onClick={() => setError('')} className="error-close">×</button>
          </div>
        </div>
      )}

      <div className="app-container">
        {!sessionCode ? (
          <SessionEntry
            onCreateSession={handleCreateSession}
            onJoinSession={handleJoinSession}
            loading={loading}
            connected={connected}
          />
        ) : (
          <ChatRoom
            socket={socket}
            sessionCode={sessionCode}
            messages={messages}
            userCount={userCount}
            onSendMessage={handleSendMessage}
            onSendMedia={handleSendMedia}
            onTyping={handleTyping}
            onLeaveSession={handleLeaveSession}
          />
        )}
      </div>

      <div className="app-footer">
        <p>🔐 End-to-end encrypted • Messages are not stored</p>
        {process.env.NODE_ENV === 'development' && (
          <p className="dev-info">Backend: {BACKEND_URL}</p>
        )}
      </div>
    </div>
  );
}

export default App;