const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ✅ CORS Configuration - Add your Vercel URL here after deployment
// ✅ CORS Configuration - Add your Vercel URL here after deployment
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://private-chat-app-ten.vercel.app',  // ✅ Your Vercel URL
  process.env.FRONTEND_URL || '',
].filter(Boolean);

// Socket.io configuration
const io = socketIO(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('Blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 50e6, // 50MB for media files
  pingTimeout: 60000,
  pingInterval: 25000
});

// Express CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Health check endpoints for deployment platforms
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
    memory: process.memoryUsage()
  });
});

// Store active sessions
const sessions = new Map();
// Format: { sessionCode: { users: [socketId1, socketId2], createdAt: timestamp, lastActivity: timestamp } }

// Session configuration
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
      // Notify users about session expiry
      session.users.forEach(socketId => {
        io.to(socketId).emit('session-expired');
      });
      sessions.delete(code);
      console.log(`Session ${code} expired due to inactivity`);
    }
  }
}, 60000); // Check every minute

// Socket.io connection handling
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
    console.log(`Session ${sessionCode} created by ${socket.id}`);
  });
  
  // Join existing session
  socket.on('join-session', ({ sessionCode }) => {
    const session = sessions.get(sessionCode);
    
    if (!session) {
      socket.emit('join-error', { message: 'Session not found. Please check the code.' });
      return;
    }
    
    if (session.users.length >= MAX_USERS_PER_SESSION) {
      socket.emit('join-error', { message: 'Session is full. Maximum 2 users allowed.' });
      return;
    }
    
    // Add user to session
    session.users.push(socket.id);
    session.lastActivity = Date.now();
    socket.join(sessionCode);
    socket.sessionCode = sessionCode;
    
    // Notify both users that they're connected
    io.to(sessionCode).emit('user-joined', { 
      users: session.users.length,
      socketId: socket.id
    });
    
    console.log(`User ${socket.id} joined session ${sessionCode}`);
  });
  
  // Handle text messages
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
  
  // Handle typing indicator
  socket.on('typing', ({ isTyping }) => {
    if (socket.sessionCode) {
      socket.to(socket.sessionCode).emit('user-typing', { 
        isTyping,
        socketId: socket.id
      });
    }
  });
  
  // Handle media sharing (images, videos, audio, documents)
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
  
  // WebRTC signaling for voice/video calls
  socket.on('call-user', ({ offer, callType }) => {
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        session.lastActivity = Date.now();
        const otherUser = session.users.find(id => id !== socket.id);
        if (otherUser) {
          io.to(otherUser).emit('incoming-call', {
            offer,
            callType,
            from: socket.id
          });
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
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket.sessionCode) {
      const session = sessions.get(socket.sessionCode);
      if (session) {
        session.users = session.users.filter(id => id !== socket.id);
        
        // Notify other user
        socket.to(socket.sessionCode).emit('user-left');
        
        // Delete session if empty
        if (session.users.length === 0) {
          sessions.delete(socket.sessionCode);
          console.log(`Session ${socket.sessionCode} destroyed - no users remaining`);
        }
      }
    }
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Error handling for server
server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Allowed origins:`, allowedOrigins);
  console.log('='.repeat(50));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});