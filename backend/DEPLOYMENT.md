# Deployment Guide for SecureChat

## Prerequisites
- [Vercel Account](https://vercel.com) (for frontend)
- [Fly.io Account](https://fly.io) (for backend)
- [flyctl CLI installed](https://fly.io/docs/hands-on/install-flyctl/)
- Git repository access

## File Setup

Place these files in your `backend/` directory:
- `Dockerfile` - Container configuration
- `.dockerignore` - Optimize build
- `fly.toml` - Fly.io configuration
- `.env.example` - Environment variables template

## Part 1: Deploy Backend to Fly.io

### Step 1: Prepare Backend
```bash
cd backend

# Copy the Dockerfile, .dockerignore, and fly.toml to this directory
```

### Step 2: Login to Fly.io
```bash
flyctl auth login
```

### Step 3: Create and Deploy App
```bash
# Launch the app (this creates it and deploys)
flyctl launch

# When prompted:
# - App name: private-chat-backend (or your choice)
# - Region: Choose closest to your users
# - Database: No
# - Upstash Redis: No
```

### Step 4: Set Environment Variables
```bash
# Set the allowed origin (you'll update this after frontend deployment)
flyctl secrets set ALLOWED_ORIGIN=http://localhost:3000

# The app will automatically redeploy with the new secret
```

### Step 5: Get Your Backend URL
```bash
flyctl status
# Note the URL: https://private-chat-backend.fly.dev
```

## Part 2: Deploy Frontend to Vercel

### Step 1: Update Frontend Configuration

In `frontend/src/App.js`, update the Socket URL:
```javascript
// Change this line:
const SOCKET_URL = 'http://localhost:5000';

// To your Fly.io backend URL:
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://private-chat-backend.fly.dev';
```

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts, then deploy to production:
vercel --prod
```

**Option B: Using Vercel Dashboard**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. Add Environment Variable:
   - **Key**: `REACT_APP_SOCKET_URL`
   - **Value**: `https://private-chat-backend.fly.dev`
5. Click **Deploy**

### Step 3: Get Your Frontend URL
After deployment completes, note your Vercel URL:
- Example: `https://private-chat-app.vercel.app`

## Part 3: Update Backend CORS

Now that you have your frontend URL, update the backend:

```bash
cd backend

# Set the correct allowed origin
flyctl secrets set ALLOWED_ORIGIN=https://private-chat-app.vercel.app

# App will redeploy automatically
```

## Part 4: Update Backend Server Code (Optional)

For better production support, update `backend/server.js`:

```javascript
const cors = require('cors');
const express = require('express');
const socketIO = require('socket.io');

const app = express();

// Get allowed origin from environment variable
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

// CORS configuration
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Use PORT from environment (Fly.io uses 8080 internally)
const PORT = process.env.PORT || 5000;

// ... rest of your code

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origin: ${allowedOrigin}`);
});
```

Then redeploy:
```bash
flyctl deploy
```

## Verification

### Test Backend
```bash
curl https://private-chat-backend.fly.dev
```

### Test Frontend
1. Visit your Vercel URL
2. Create a session
3. Open in incognito/another browser
4. Join the session with the code
5. Test messaging, file sharing, and calls

## Monitoring

### Backend Logs (Fly.io)
```bash
flyctl logs
```

### Frontend Logs (Vercel)
Check Vercel Dashboard → Your Project → Deployments → Runtime Logs

## Troubleshooting

### CORS Errors
- Verify `ALLOWED_ORIGIN` secret on Fly.io matches your Vercel URL exactly
- Check `server.js` uses the environment variable
- Redeploy backend: `flyctl deploy`

### WebSocket Connection Failed
- Ensure backend is running: `flyctl status`
- Check backend logs: `flyctl logs`
- Verify `REACT_APP_SOCKET_URL` in Vercel environment variables

### Frontend Not Connecting
- Check browser console for errors
- Verify environment variable is set in Vercel
- Redeploy frontend after changing env vars

### Backend Crashes
- Check logs: `flyctl logs`
- Verify all dependencies in `package.json`
- Check memory limits: `flyctl scale memory 512` (if needed)

## Costs

### Fly.io
- Free tier: 3 shared-cpu-1x VMs, 160GB bandwidth/month
- Your app uses: 1 VM with 256MB RAM (within free tier)
- [Pricing Details](https://fly.io/docs/about/pricing/)

### Vercel
- Hobby (Free): 100GB bandwidth/month, unlimited deployments
- [Pricing Details](https://vercel.com/pricing)

## Custom Domain (Optional)

### For Frontend (Vercel)
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `chat.yourdomain.com`)
3. Update DNS records as instructed

### For Backend (Fly.io)
```bash
flyctl certs create api.yourdomain.com
```

Then update your frontend's `REACT_APP_SOCKET_URL` to use the custom domain.

## Security Enhancements

1. **Enable HTTPS**: Both Fly.io and Vercel provide free SSL certificates
2. **Add Rate Limiting**: Prevent abuse
3. **Implement Session Tokens**: Use crypto-secure random generation
4. **Add Input Validation**: Sanitize all user inputs
5. **Environment Variables**: Never commit secrets to Git

## Scaling

### Backend (Fly.io)
```bash
# Add more VMs
flyctl scale count 2

# Increase memory
flyctl scale memory 512

# Change VM type
flyctl scale vm shared-cpu-2x
```

### Frontend (Vercel)
Automatic - Vercel scales based on traffic

---

**Deployment Complete! 🚀**

Your chat app should now be live and accessible worldwide.