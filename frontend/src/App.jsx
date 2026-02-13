import React, { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import ChatRoom from './components/ChatRoom';
import SessionEntry from './components/SessionEntry';
import Sidebar from './components/Sidebar';
import ContactList from './components/ContactList';
import './styles/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

console.log('🔌 Backend URL:', BACKEND_URL);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <button onClick={() => window.location.reload()}>Refresh Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [inChat, setInChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);

  // Refs for socket event handlers to access latest state
  const isCreatorRef = useRef(false);
  const selectedContactRef = useRef(null);
  const sessionCodeRef = useRef('');
  const socketRef = useRef(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    isCreatorRef.current = isCreator;
  }, [isCreator]);
  
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    sessionCodeRef.current = sessionCode;
  }, [sessionCode]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Define handleLeaveSession first so useEffect can use it
  const handleLeaveSession = useCallback(() => {
    const currentSocket = socketRef.current;
    const currentSessionCode = sessionCodeRef.current;
    if (currentSocket && currentSessionCode) {
      currentSocket.emit('leave-session');
    }
    if (currentSocket) {
      currentSocket.disconnect();
      currentSocket.connect();
    }
    setSessionCode('');
    setIsCreator(false);
    setInChat(false);
    setMessages([]);
    setUserCount(1);
    setError('');
    setContacts([]);
    setSelectedContact(null);
  }, []);

  // Initialize socket
  useEffect(() => {
    console.log('Connecting to:', BACKEND_URL);
    
    const wakeServer = async () => {
      try {
        await fetch(BACKEND_URL + '/health', { mode: 'cors' });
      } catch (e) {
        // Server might be sleeping, continue anyway
      }
    };
    
    wakeServer();
    
    const connectTimeout = setTimeout(() => {
      const newSocket = io(BACKEND_URL, {
        transports: ['polling'],
        reconnection: true,
        reconnectionAttempts: 5,
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected:', newSocket.id);
        setConnected(true);
        setError('');
      });

      newSocket.on('connect_error', (err) => {
        console.error('❌ Connection error:', err.message);
        setConnected(false);
        setError('Cannot connect to server');
      });

      newSocket.on('disconnect', () => {
        console.log('⚠️ Disconnected');
        setConnected(false);
      });

      // Session created (User 1)
      newSocket.on('session-created', ({ sessionCode }) => {
        console.log('✅ Session created:', sessionCode);
        setSessionCode(sessionCode);
        setIsCreator(true);
        setInChat(false); // Stay on entry page
        setUserCount(1);
        setMessages([]);
        setError('');
        setLoading(false);
        
        // Setup contact
        const timeString = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const contact = {
          id: sessionCode,
          name: 'Chat Partner',
          lastMessage: 'Waiting for partner...',
          lastMessageTime: timeString,
          isOnline: false,
          unreadCount: 0
        };
        setSelectedContact(contact);
      });

      // User joined (User 2)
      newSocket.on('join-success', ({ sessionCode, users }) => {
        console.log('✅ Joined session:', sessionCode);
        setSessionCode(sessionCode);
        setIsCreator(false);
        setInChat(true);
        setUserCount(users);
        setMessages([]);
        setError('');
        setLoading(false);
      });

      newSocket.on('session-error', ({ message }) => {
        console.error('❌ Session error:', message);
        setError(message);
        setLoading(false);
      });

      newSocket.on('join-error', ({ message }) => {
        console.error('❌ Join error:', message);
        setError(message);
        setLoading(false);
      });

      newSocket.on('user-joined', ({ users, socketId }) => {
        console.log('User joined:', users);
        setUserCount(users);
        setInChat(true);
      });

      newSocket.on('user-left', () => {
        console.log('User left');
        setUserCount(1);
      });

      newSocket.on('receive-message', ({ message, sender, timestamp }) => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: message,
          sender,
          timestamp,
          isOwn: sender === newSocket.id
        }]);
      });

      newSocket.on('receive-media', ({ mediaData, mediaType, fileName, sender, timestamp }) => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'media',
          mediaData,
          mediaType,
          fileName,
          sender,
          timestamp,
          isOwn: sender === newSocket.id
        }]);
      });

      newSocket.on('user-typing', ({ isTyping }) => {
        // Handle typing indicator
      });

      newSocket.on('incoming-call', ({ offer, callType, from }) => {
        // Handle incoming call
      });

      newSocket.on('call-answered', ({ answer }) => {
        // Handle call answered
      });

      newSocket.on('ice-candidate', ({ candidate }) => {
        // Handle ICE candidate
      });

      newSocket.on('call-ended', () => {
        // Handle call ended
      });

      newSocket.on('call-rejected', () => {
        // Handle call rejected
      });

      // Session expired
      newSocket.on('session-expired', () => {
        setError('Session expired');
        handleLeaveSession();
      });

      setSocket(newSocket);
    }, 1000);

    return () => {
      clearTimeout(connectTimeout);
      if (socket) {
        socket.close();
      }
    };
  }, [handleLeaveSession]);

  const handleCreateSession = () => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }
    setLoading(true);
    setError('');
    socket.emit('create-session');
  };

  const handleJoinSession = (code) => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }
    
    if (!code || code.trim().length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }
    
    console.log('Joining session:', code);
    setLoading(true);
    setError('');
    socket.emit('join-session', { sessionCode: code.trim().toUpperCase() });
  };

  const handleSendMessage = (message) => {
    if (!socket || !sessionCode || !message.trim()) return;
    
    socket.emit('send-message', { message });
    
    setMessages(prev => [...prev, {
      type: 'text',
      text: message,
      isMine: true,
      timestamp: Date.now()
    }]);
  };

  const handleSendMedia = (mediaData, mediaType, fileName, fileSize) => {
    if (!socket || !sessionCode) return;
    
    socket.emit('send-media', { mediaData, mediaType, fileName, fileSize });
    
    setMessages(prev => [...prev, {
      type: 'media',
      mediaData,
      mediaType,
      fileName,
      fileSize,
      isMine: true,
      timestamp: Date.now()
    }]);
  };

  const handleTyping = (isTyping) => {
    if (!socket || !sessionCode) return;
    socket.emit('typing', { isTyping });
  };

  return (
    <div className="app">
      {!inChat ? (
        <div className="app-container">
          <SessionEntry
            onCreateSession={handleCreateSession}
            onJoinSession={handleJoinSession}
            loading={loading}
            connected={connected}
            sessionCode={sessionCode}
            isCreator={isCreator}
            onEnterChat={() => setInChat(true)}
          />
        </div>
      ) : (
        <div className="main-layout">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <ContactList 
            contacts={contacts}
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <ChatRoom
            socket={socket}
            sessionCode={sessionCode}
            messages={messages}
            userCount={userCount}
            onSendMessage={handleSendMessage}
            onSendMedia={handleSendMedia}
            onTyping={handleTyping}
            onLeaveSession={handleLeaveSession}
            selectedContact={selectedContact}
            connected={connected}
            error={error}
            onDismissError={() => setError('')}
          />
        </div>
      )}
    </div>
  );
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
