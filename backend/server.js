const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS Configuration - Allow all origins for now
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://192.168.43.131:3000',
  'https://private-chat-app-iota.vercel.app',
  'https://private-chat-app.vercel.app',
  'https://private-chat-app-shreyashbagade358.vercel.app',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

console.log('📋 Allowed CORS origins:', allowedOrigins);

const io = socketIO(server, {
  cors: {
    origin: '*', // Allow all origins for WebSocket
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 50e6,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

app.use(cors({
  origin: '*', // Allow all origins
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Private Chat App Backend Running',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    activeSessions: sessions.size
  });
});

// Store active sessions
const sessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_USERS_PER_SESSION = 2;

// Generate random 10-digit code
function generateSessionCode() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Clean up inactive sessions
setInterval(() => {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      session.users.forEach(socketId => {
        io.to(socketId).emit('session-expired');
      });
      sessions.delete(code);
      console.log(`Session ${code} expired`);
    }
  }
}, 60000);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Create new session
  socket.on('create-session', () => {
    const sessionCode = generateSessionCode();
    sessions.set(sessionCode, {
      users: [socket.id],
      createdAt: Date.now(),
      lastActivity: Date.now()
    });
    
    socket.join(sessionCode);
    socket.sessionCode = sessionCode;
    
    socket.emit('session-created', { sessionCode });
    console.log(`✅ Session ${sessionCode} created by ${socket.id}`);
  });
  
  // Join existing session
  socket.on('join-session', ({ sessionCode }) => {
    console.log(`📝 User ${socket.id} trying to join: ${sessionCode}`);
    console.log(`📋 Active sessions:`, Array.from(sessions.keys()));
    
    const session = sessions.get(sessionCode);
    
    if (!session) {
      console.log(`❌ Session ${sessionCode} not found`);
      socket.emit('join-error', { message: 'Session not found' });
      return;
    }
    
    if (session.users.length >= MAX_USERS_PER_SESSION) {
      console.log(`❌ Session ${sessionCode} is full`);
      socket.emit('join-error', { message: 'Session is full' });
      return;
    }
    
    // Add user to session
    session.users.push(socket.id);
    session.lastActivity = Date.now();
    socket.join(sessionCode);
    socket.sessionCode = sessionCode;
    
    // Notify ALL users in session (including creator)
    io.to(sessionCode).emit('user-joined', { 
      users: session.users.length,
      socketId: socket.id
    });
    
    // Send confirmation to joining user
    socket.emit('join-success', { 
      sessionCode: sessionCode,
      users: session.users.length 
    });
    
    console.log(`✅ User ${socket.id} joined session ${sessionCode}`);
  });
  
  // Handle messages
  socket.on('send-message', ({ message }) => {
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        session.lastActivity = Date.now();
        socket.to(socket.sessionCode).emit('receive-message', {
          message,
          sender: socket.id,
          timestamp: Date.now()
        });
      }
    }
  });
  
  // Handle typing
  socket.on('typing', ({ isTyping }) => {
    if (socket.sessionCode) {
      socket.to(socket.sessionCode).emit('user-typing', { isTyping });
    }
  });
  
  // Handle media
  socket.on('send-media', ({ mediaData, mediaType, fileName, fileSize }) => {
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        session.lastActivity = Date.now();
        socket.to(socket.sessionCode).emit('receive-media', {
          mediaData,
          mediaType,
          fileName,
          fileSize,
          sender: socket.id,
          timestamp: Date.now()
        });
      }
    }
  });
  
  // WebRTC signaling
  socket.on('call-user', ({ offer, callType }) => {
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        const otherUser = session.users.find(id => id !== socket.id);
        if (otherUser) {
          io.to(otherUser).emit('incoming-call', { offer, callType, from: socket.id });
        }
      }
    }
  });
  
  socket.on('answer-call', ({ answer }) => {
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        const otherUser = session.users.find(id => id !== socket.id);
        if (otherUser) {
          io.to(otherUser).emit('call-answered', { answer });
        }
      }
    }
  });
  
  socket.on('ice-candidate', ({ candidate }) => {
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        const otherUser = session.users.find(id => id !== socket.id);
        if (otherUser) {
          io.to(otherUser).emit('ice-candidate', { candidate });
        }
      }
    }
  });
  
  socket.on('end-call', () => {
    if (socket.sessionCode) {
      socket.to(socket.sessionCode).emit('call-ended');
    }
  });
  
  socket.on('reject-call', () => {
    if (socket.sessionCode) {
      socket.to(socket.sessionCode).emit('call-rejected');
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        session.users = session.users.filter(id => id !== socket.id);
        socket.to(socket.sessionCode).emit('user-left');
        
        if (session.users.length === 0) {
          sessions.delete(socket.sessionCode);
          console.log(`Session ${socket.sessionCode} deleted`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS: Allowing all origins`);
  console.log('='.repeat(50));
});

// Log all incoming connections
io.use((socket, next) => {
  console.log(`🔌 New connection attempt from: ${socket.handshake.headers.origin || 'unknown'}`);
  next();
});
