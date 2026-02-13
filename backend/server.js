const crypto = require('crypto');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Rate limiting
const rateLimit = require('express-rate-limit');
const createSessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many session creation attempts, please wait' }
});
const joinSessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many join attempts, please wait' }
});

// CORS Configuration
const isProduction = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: isProduction ? process.env.FRONTEND_URL : ['http://localhost:8000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST']
};

const io = socketIO(server, {
  cors: corsOptions,
  maxHttpBufferSize: 10e6,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Apply rate limiters
app.use('/api/create', createSessionLimiter);
app.use('/api/join', joinSessionLimiter);

// Health check (reduced info in production)
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
const SESSION_TIMEOUT = 30 * 60 * 1000;
const MAX_USERS_PER_SESSION = 2;

// Generate secure 6-character session code
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVW23456789';
  let code = '';
  const values = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[values[i] % chars.length];
  }
  return code;
}

function isValidSessionCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/i.test(code);
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
    let sessionCode;
    let attempts = 0;
    do {
      sessionCode = generateSessionCode();
      attempts++;
    } while (sessions.has(sessionCode) && attempts < 10);
    
    if (sessions.has(sessionCode)) {
      socket.emit('session-error', { message: 'Failed to create session, please try again' });
      return;
    }
    
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
    if (!isValidSessionCode(sessionCode)) {
      socket.emit('join-error', { message: 'Invalid session code' });
      return;
    }
    
    console.log(`📝 User ${socket.id} trying to join: ${sessionCode}`);
    
    const session = sessions.get(sessionCode);
    
    if (!session) {
      socket.emit('join-error', { message: 'Session not found or expired' });
      return;
    }
    
    if (session.users.length >= MAX_USERS_PER_SESSION) {
      socket.emit('join-error', { message: 'Session is full' });
      return;
    }
    
    if (session.users.includes(socket.id)) {
      socket.emit('join-error', { message: 'Already in this session' });
      return;
    }
    
    session.users.push(socket.id);
    session.lastActivity = Date.now();
    socket.join(sessionCode);
    socket.sessionCode = sessionCode;
    
    io.to(sessionCode).emit('user-joined', { 
      users: session.users.length,
      socketId: socket.id
    });
    
    socket.emit('join-success', { 
      sessionCode: sessionCode,
      users: session.users.length 
    });
    
    console.log(`✅ User ${socket.id} joined session ${sessionCode}`);
  });
  
  // Leave session
  socket.on('leave-session', () => {
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        session.users = session.users.filter(id => id !== socket.id);
        socket.leave(socket.sessionCode);
        socket.to(socket.sessionCode).emit('user-left');
        
        if (session.users.length === 0) {
          sessions.delete(socket.sessionCode);
          console.log(`Session ${socket.sessionCode} deleted`);
        }
      }
      socket.sessionCode = null;
    }
  });
  
  // Handle messages
  socket.on('send-message', ({ message }) => {
    if (!socket.sessionCode) return;
    
    if (typeof message !== 'string' || message.length === 0 || message.length > 5000) {
      return;
    }
    
    const session = sessions.get(socket.sessionCode);
    if (session) {
      session.lastActivity = Date.now();
      const safeMessage = message.slice(0, 5000);
      socket.to(socket.sessionCode).emit('receive-message', {
        message: safeMessage,
        sender: socket.id,
        timestamp: Date.now()
      });
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
    if (!socket.sessionCode) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(mediaType) || !fileName || fileSize > 5e6) {
      return;
    }
    
    const session = sessions.get(socket.sessionCode);
    if (session) {
      session.lastActivity = Date.now();
      socket.to(socket.sessionCode).emit('receive-media', {
        mediaData,
        mediaType,
        fileName: fileName.slice(0, 255),
        fileSize,
        sender: socket.id,
        timestamp: Date.now()
      });
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
  console.log(`🌐 CORS: ${isProduction ? 'Production mode' : 'Development mode'}`);
  console.log('='.repeat(50));
});

// Log all incoming connections
io.use((socket, next) => {
  console.log(`🔌 New connection attempt from: ${socket.handshake.headers.origin || 'unknown'}`);
  next();
});
