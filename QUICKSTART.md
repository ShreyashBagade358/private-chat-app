# 🚀 Quick Start Guide

Get your SecureChat application running in 5 minutes!

## Prerequisites Check

Open your terminal and verify you have Node.js installed:

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show 8.0.0 or higher
```

If you don't have Node.js, download it from: https://nodejs.org/

## Step-by-Step Setup

### 1️⃣ Open Two Terminal Windows

You'll need one terminal for the backend and one for the frontend.

### 2️⃣ Terminal 1 - Start Backend

```bash
# Navigate to backend folder
cd private-chat-app/backend

# Install dependencies (first time only)
npm install

# Start the server
npm start
```

✅ You should see: `Server running on port 5000`

### 3️⃣ Terminal 2 - Start Frontend

```bash
# Navigate to frontend folder
cd private-chat-app/frontend

# Install dependencies (first time only)
npm install

# Start the React app
npm start
```

✅ Your browser will automatically open to `http://localhost:3000`

## 🎉 You're Ready!

### Test It Out:

1. **Create a Session**
   - Click "Create New Session"
   - Copy the 10-digit code that appears

2. **Join from Another Browser/Device**
   - Open `http://localhost:3000` in another browser tab or device
   - Click "Join Existing Session"
   - Enter the 10-digit code
   - Click "Join Session"

3. **Start Chatting**
   - Send messages
   - Share files (click the paperclip icon)
   - Make audio/video calls (click the phone/camera icons)

## Common Issues

### Port Already in Use

**Backend (Port 5000):**
```bash
# Mac/Linux - Kill process on port 5000
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Frontend (Port 3000):**
The frontend will automatically try port 3001, 3002, etc. if 3000 is busy.

### Can't Connect

1. Make sure backend is running first
2. Check that you see "Server running on port 5000"
3. Restart both frontend and backend

### Camera/Mic Not Working

1. Click the lock icon in your browser's address bar
2. Allow camera and microphone permissions
3. Reload the page

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Customize the app colors and branding

## Need Help?

- Check the troubleshooting section in README.md
- Verify all dependencies are installed correctly
- Make sure both servers are running

---

**Happy Chatting! 💬**
