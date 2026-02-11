import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import ChatRoom from './components/ChatRoom';
import SessionEntry from './components/SessionEntry';
import Sidebar from './components/Sidebar';
import ContactList from './components/ContactList';
import './styles/App.css';

// ✅ CRITICAL: Use environment variable for backend URL
// Priority: 1. Environment variable (production), 2. Localhost (development)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

console.log('🔗 Backend URL:', BACKEND_URL);

// Error Boundary Component to catch errors and prevent blue screen
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>The application encountered an error. Please refresh the page to continue.</p>
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
  const [createdSessionCode, setCreatedSessionCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([
    { id: 1, name: 'User Name', lastMessage: 'Last message preview text...', lastMessageTime: '10:30 AM', isOnline: true, unreadCount: 0 },
  ]);
  const [isInChat, setIsInChat] = useState(false);
  
  const typingTimeoutRef = useRef(null);
  const createdSessionCodeRef = useRef('');
  const isInChatRef = useRef(false);
  
  // Keep refs in sync with state for socket event handlers
  useEffect(() => {
    createdSessionCodeRef.current = createdSessionCode;
  }, [createdSessionCode]);
  
  useEffect(() => {
    isInChatRef.current = isInChat;
  }, [isInChat]);

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
      setCreatedSessionCode(sessionCode);
      createdSessionCodeRef.current = sessionCode; // Sync ref immediately
      setSessionCode(sessionCode);
      setUserCount(1);
      setMessages([]);
      setError('');
      setLoading(false);
      setIsInChat(false); // Stay on entry page to show the code
      isInChatRef.current = false; // Sync ref immediately
      
      // Add contact for created session
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setContacts([{
        id: sessionCode,
        name: 'Chat Partner',
        lastMessage: 'Waiting for partner...',
        lastMessageTime: timeString,
        isOnline: false,
        unreadCount: 0
      }]);
      setSelectedContact({
        id: sessionCode,
        name: 'Chat Partner',
        lastMessage: 'Waiting for partner...',
        lastMessageTime: timeString,
        isOnline: false,
        unreadCount: 0
      });
    });

    newSocket.on('join-error', ({ message }) => {
      console.error('Join error:', message);
      setError(message);
      setSessionCode('');
      setLoading(false);
    });

    newSocket.on('join-success', ({ sessionCode, users }) => {
      console.log('✅ Successfully joined session:', sessionCode, 'Users:', users);
      setSessionCode(sessionCode);
      setUserCount(users);
      setLoading(false);
      setIsInChat(true); // Joining user goes directly to chat
      console.log('Switched to chat room');
      
      // Add contact for joined session
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const newContact = {
        id: sessionCode,
        name: 'Chat Partner',
        lastMessage: 'Session joined',
        lastMessageTime: timeString,
        isOnline: true,
        unreadCount: 0
      };
      setContacts([newContact]);
      setSelectedContact(newContact);
    });

    newSocket.on('user-joined', ({ users, socketId }) => {
      console.log('User joined event received. Total users:', users, 'Socket ID:', socketId, 'My ID:', newSocket.id);
      console.log('Creator code ref:', createdSessionCodeRef.current, 'Is in chat ref:', isInChatRef.current);
      
      setUserCount(users || 2);
      
      // Update contact to online
      setContacts(prev => prev.map(c => ({ ...c, isOnline: true, lastMessage: 'User joined the session' })));
      if (selectedContact) {
        setSelectedContact(prev => ({ ...prev, isOnline: true, lastMessage: 'User joined the session' }));
      }
      
      // Check if this is the session creator (not the one who just joined)
      const isCreator = newSocket.id !== socketId;
      const hasCreatedCode = !!createdSessionCodeRef.current;
      const notInChatYet = !isInChatRef.current;
      
      console.log('Is creator:', isCreator, 'Has created code:', hasCreatedCode, 'Not in chat:', notInChatYet);
      
      // If this is the session creator and someone joined, enter the chat
      if (isCreator && hasCreatedCode && notInChatYet) {
        console.log('Creator entering chat room...');
        setIsInChat(true);
        isInChatRef.current = true; // Update ref immediately
      }
      
      // Only show system message for the existing user (not the one who just joined)
      if (isCreator) {
        setMessages(prev => [...prev, {
          type: 'system',
          text: 'User joined the session',
          timestamp: Date.now()
        }]);
      }
    });

    newSocket.on('user-left', () => {
      console.log('User left the session');
      setUserCount(prev => Math.max(1, prev - 1));
      
      // Update contact to offline
      setContacts(prev => prev.map(c => ({ ...c, isOnline: false, lastMessage: 'User left the session' })));
      if (selectedContact) {
        setSelectedContact(prev => ({ ...prev, isOnline: false, lastMessage: 'User left the session' }));
      }
      
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
        type: 'text',
        text: message,
        isMine: false,
        sender,
        timestamp
      }]);
      
      // Update contact's last message
      const now = new Date(timestamp);
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setContacts(prev => prev.map(c => ({ 
        ...c, 
        lastMessage: message.length > 30 ? message.substring(0, 30) + '...' : message,
        lastMessageTime: timeString
      })));
      if (selectedContact) {
        setSelectedContact(prev => ({ 
          ...prev, 
          lastMessage: message.length > 30 ? message.substring(0, 30) + '...' : message,
          lastMessageTime: timeString
        }));
      }
    });

    // Media events
    newSocket.on('receive-media', ({ mediaData, mediaType, fileName, fileSize, sender, timestamp }) => {
      console.log('Media received:', mediaType, fileName);
      setMessages(prev => [...prev, {
        type: 'media',
        mediaData,
        mediaType,
        fileName,
        fileSize,
        isMine: false,
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
  }, [selectedContact]);

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
    
    console.log('Attempting to join session:', code);
    setLoading(true);
    setError('');
    // Store the code we're trying to join (don't switch UI yet)
    setSessionCode(code);
    socket.emit('join-session', { sessionCode: code });
  };

    // Send text message
  const handleSendMessage = (message) => {
    if (!socket || !sessionCode || !message.trim()) return;
    
    // Send to other user
    socket.emit('send-message', { message });
    
    // Add to own messages
    const timestamp = Date.now();
    setMessages(prev => [...prev, {
      type: 'text',
      text: message,
      isMine: true,
      timestamp
    }]);
    
    // Update contact's last message
    const now = new Date(timestamp);
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setContacts(prev => prev.map(c => ({ 
      ...c, 
      lastMessage: message.length > 30 ? message.substring(0, 30) + '...' : message,
      lastMessageTime: timeString
    })));
    if (selectedContact) {
      setSelectedContact(prev => ({ 
        ...prev, 
        lastMessage: message.length > 30 ? message.substring(0, 30) + '...' : message,
        lastMessageTime: timeString
      }));
    }
  };

    // Send media (images, videos, files)
  const handleSendMedia = (mediaData, mediaType, fileName, fileSize) => {
    if (!socket || !sessionCode) {
      console.error('Cannot send media: no socket or session');
      return;
    }
    
    console.log('Sending media:', fileName, 'Type:', mediaType, 'Size:', fileSize);
    
    // Send to other user
    socket.emit('send-media', { mediaData, mediaType, fileName, fileSize });
    
    // Add to own messages
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
    setCreatedSessionCode('');
    setMessages([]);
    setUserCount(1);
    setError('');
    setIsInChat(false);
  };

  return (
    <div className="app">
      {!isInChat ? (
        <div className="app-container">
          <SessionEntry
            onCreateSession={handleCreateSession}
            onJoinSession={handleJoinSession}
            loading={loading}
            connected={connected}
            createdSessionCode={createdSessionCode}
            onEnterChat={() => {
              console.log('Manually entering chat room');
              setIsInChat(true);
              isInChatRef.current = true;
            }}
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

// Wrap App with ErrorBoundary
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
