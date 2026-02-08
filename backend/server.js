const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

const io = socketIO(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 50e6 // 50MB for media files
});

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

// Health check endpoint for deployment platforms
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Private Chat App Backend Running' });
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
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
