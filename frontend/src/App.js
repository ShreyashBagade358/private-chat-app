import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import SessionEntry from './components/SessionEntry';
import ChatRoom from './components/ChatRoom';
import './styles/App.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });
    
    newSocket.on('session-created', ({ sessionCode }) => {
      setSessionCode(sessionCode);
      setIsConnected(true);
      setUserCount(1);
    });
    
    newSocket.on('user-joined', ({ users }) => {
      setIsConnected(true);
      setUserCount(users);
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'User joined the chat',
        timestamp: Date.now()
      }]);
    });
    
    newSocket.on('join-error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(''), 5000);
    });
    
    newSocket.on('receive-message', ({ message, sender, timestamp }) => {
      setMessages(prev => [...prev, {
        type: 'text',
        message,
        sender,
        timestamp,
        isMine: false
      }]);
    });
    
    newSocket.on('receive-media', ({ mediaData, mediaType, fileName, fileSize, sender, timestamp }) => {
      setMessages(prev => [...prev, {
        type: 'media',
        mediaData,
        mediaType,
        fileName,
        fileSize,
        sender,
        timestamp,
        isMine: false
      }]);
    });
    
    newSocket.on('user-left', () => {
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'User left the chat',
        timestamp: Date.now()
      }]);
      setUserCount(1);
    });
    
    newSocket.on('session-expired', () => {
      setError('Session expired due to inactivity');
      setTimeout(() => {
        setIsConnected(false);
        setSessionCode('');
        setMessages([]);
      }, 3000);
    });
    
    return () => {
      newSocket.close();
    };
  }, []);
  
  const createSession = () => {
    if (socket) {
      socket.emit('create-session');
    }
  };
  
  const joinSession = (code) => {
    if (socket && code.length === 10) {
      socket.emit('join-session', { sessionCode: code });
      setSessionCode(code);
    } else {
      setError('Please enter a valid 10-digit code');
      setTimeout(() => setError(''), 3000);
    }
  };
  
  const sendMessage = (message) => {
    if (socket && message.trim()) {
      socket.emit('send-message', { message });
      setMessages(prev => [...prev, {
        type: 'text',
        message,
        sender: socket.id,
        timestamp: Date.now(),
        isMine: true
      }]);
    }
  };
  
  const sendMedia = (file) => {
    if (socket && file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const mediaData = e.target.result;
        const mediaType = file.type.split('/')[0]; // image, video, audio, application
        
        socket.emit('send-media', {
          mediaData,
          mediaType: file.type,
          fileName: file.name,
          fileSize: file.size
        });
        
        setMessages(prev => [...prev, {
          type: 'media',
          mediaData,
          mediaType: file.type,
          fileName: file.name,
          fileSize: file.size,
          sender: socket.id,
          timestamp: Date.now(),
          isMine: true
        }]);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleTyping = (isTyping) => {
    if (socket) {
      socket.emit('typing', { isTyping });
    }
  };
  
  return (
    <div className="app">
      {!isConnected ? (
        <SessionEntry
          onCreateSession={createSession}
          onJoinSession={joinSession}
          error={error}
        />
      ) : (
        <ChatRoom
          socket={socket}
          sessionCode={sessionCode}
          messages={messages}
          userCount={userCount}
          onSendMessage={sendMessage}
          onSendMedia={sendMedia}
          onTyping={handleTyping}
        />
      )}
    </div>
  );
}

export default App;
