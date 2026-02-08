# SecureChat - Private Real-Time Chat Application

A full-stack real-time chatting website where two users can communicate privately using a shared 10-digit session code. Built with React, Node.js, Socket.IO, and WebRTC.

![SecureChat](https://img.shields.io/badge/Status-Production%20Ready-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6-orange)

## 🚀 Features

### Core Features
- **10-Digit Session Codes**: Unique port-like system for private sessions
- **Two-User Limit**: Automatically rejects additional users
- **Real-Time Messaging**: Instant text communication with typing indicators
- **End-to-End Communication**: Direct peer-to-peer connections for calls

### Media Sharing
- **Image Sharing**: Send and preview images inline
- **Video Sharing**: Share and play videos directly in chat
- **Audio Files**: Send and play audio messages
- **Document Sharing**: Share PDFs, documents, and other files
- **File Size Limit**: Up to 50MB per file

### Voice & Video Calls
- **Audio Calls**: High-quality voice communication
- **Video Calls**: One-to-one video calling
- **Call Controls**: Mute/unmute microphone, enable/disable camera
- **WebRTC Technology**: Peer-to-peer connections for low latency

### Session Management
- **Auto-Expiry**: Sessions expire after 30 minutes of inactivity
- **Session Destruction**: Automatically destroyed when both users leave
- **Connection Status**: Real-time user online/offline indicators

### Security & Privacy
- **No Registration**: Guest users, no login required
- **Session Privacy**: Only 2 users can join each session
- **Temporary Storage**: No permanent chat history
- **Secure WebRTC**: Encrypted peer-to-peer connections

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, Edge)

## 🛠️ Installation & Setup

### 1. Clone or Download the Project

```bash
# Navigate to the project directory
cd private-chat-app
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the backend server
npm start
```

The backend server will start on `http://localhost:5000`

**For Development (with auto-restart):**
```bash
npm run dev
```

### 3. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the React development server
npm start
```

The frontend will open automatically at `http://localhost:3000`

## 📁 Project Structure

```
private-chat-app/
├── backend/
│   ├── server.js           # Express & Socket.IO server
│   └── package.json        # Backend dependencies
│
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── SessionEntry.js     # Login/Join screen
│   │   │   ├── ChatRoom.js         # Main chat interface
│   │   │   ├── MessageList.js      # Message display
│   │   │   ├── MessageInput.js     # Message input
│   │   │   └── CallInterface.js    # Video/Audio call UI
│   │   ├── styles/
│   │   │   ├── App.css
│   │   │   ├── SessionEntry.css
│   │   │   ├── ChatRoom.css
│   │   │   ├── MessageList.css
│   │   │   ├── MessageInput.css
│   │   │   └── CallInterface.css
│   │   ├── App.js           # Main React component
│   │   └── index.js         # React entry point
│   └── package.json         # Frontend dependencies
│
└── README.md               # This file
```

## 🎯 How to Use

### Creating a Session

1. Open the app at `http://localhost:3000`
2. Click **"Create New Session"**
3. You'll receive a unique 10-digit code
4. Share this code with the person you want to chat with

### Joining a Session

1. Open the app at `http://localhost:3000`
2. Click **"Join Existing Session"**
3. Enter the 10-digit code provided by the session creator
4. Click **"Join Session"**

### Chatting

- **Text Messages**: Type in the input box and press Enter or click Send
- **Attach Media**: Click the paperclip icon to select files
- **Audio Call**: Click the phone icon (requires 2 users online)
- **Video Call**: Click the video camera icon (requires 2 users online)

### During a Call

- **Mute/Unmute**: Click the microphone button
- **Camera On/Off**: Click the camera button (video calls only)
- **End Call**: Click the red phone button

## 🔧 Configuration

### Backend Configuration

Edit `backend/server.js` to customize:

```javascript
const PORT = process.env.PORT || 5000;  // Server port
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_USERS_PER_SESSION = 2;        // Maximum 2 users
```

### Frontend Configuration

Edit `frontend/src/App.js` to change the backend URL:

```javascript
const SOCKET_URL = 'http://localhost:5000';
```

### CORS Configuration

The backend allows connections from `http://localhost:3000` by default. To change this, edit `backend/server.js`:

```javascript
const io = socketIO(server, {
  cors: {
    origin: "http://your-frontend-url.com",
    methods: ["GET", "POST"]
  }
});
```

## 🌐 Production Deployment

### Backend Deployment

1. Set environment variables:
```bash
export PORT=5000
export NODE_ENV=production
```

2. Update CORS origin to your production frontend URL

3. Deploy to platforms like:
   - Heroku
   - DigitalOcean
   - AWS EC2
   - Google Cloud Platform

### Frontend Deployment

1. Build the production version:
```bash
cd frontend
npm run build
```

2. Deploy the `build` folder to:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - Firebase Hosting

3. Update `SOCKET_URL` in `App.js` to point to your production backend

## 🔒 Security Considerations

### Current Implementation
- WebRTC connections use STUN servers for NAT traversal
- Socket.IO connections are established over HTTP
- No persistent storage of messages
- Session codes are randomly generated

### Production Recommendations
1. **Enable HTTPS**: Use SSL/TLS certificates for both frontend and backend
2. **Secure WebSocket**: Use WSS (WebSocket Secure) instead of WS
3. **TURN Server**: Add TURN servers for better WebRTC connectivity
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Authentication**: Add optional user authentication
6. **Message Encryption**: Implement end-to-end encryption for messages
7. **Input Validation**: Sanitize all user inputs
8. **Session Token**: Use cryptographically secure session tokens

## 🐛 Troubleshooting

### Backend won't start
- Check if port 5000 is already in use
- Run: `lsof -i :5000` (Mac/Linux) or `netstat -ano | findstr :5000` (Windows)
- Kill the process or change the port

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check CORS configuration in `backend/server.js`
- Verify `SOCKET_URL` in `frontend/src/App.js`

### Camera/Microphone not working
- Grant browser permissions for camera/microphone
- Check if another app is using the camera
- Use HTTPS in production (required by browsers)

### WebRTC connection fails
- Check firewall settings
- Ensure STUN/TURN servers are accessible
- Test on same network first

### Session code not working
- Verify code is exactly 10 digits
- Check if session expired (30 min timeout)
- Ensure backend server is running

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Mobile browsers (limited WebRTC support on some devices)

## 🎨 Customization

### Changing Colors

Edit CSS variables in `frontend/src/styles/App.css`:

```css
:root {
  --primary-color: #2d5bff;
  --primary-dark: #1e40af;
  --success-color: #10b981;
  /* ... add your colors */
}
```

### Changing App Name

1. Update `SessionEntry.js` component
2. Update `index.html` title
3. Update README.md

## 📊 Technology Stack

### Frontend
- **React** 18.2 - UI framework
- **Socket.IO Client** 4.6 - Real-time communication
- **WebRTC** - Peer-to-peer video/audio

### Backend
- **Node.js** 18+ - Runtime environment
- **Express** 4.18 - Web framework
- **Socket.IO** 4.6 - WebSocket library
- **CORS** - Cross-origin resource sharing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- WebRTC for peer-to-peer connections
- React for the amazing UI framework

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions

## 🔮 Future Enhancements

- [ ] Group chat support (3+ users)
- [ ] Message reactions and emojis
- [ ] Screen sharing
- [ ] File transfer progress indicator
- [ ] Message search functionality
- [ ] Dark/Light theme toggle
- [ ] Mobile responsive improvements
- [ ] Push notifications
- [ ] Message delivery status
- [ ] User avatars
- [ ] Session persistence
- [ ] Password-protected sessions

---

**Built with ❤️ for secure, private communication**
