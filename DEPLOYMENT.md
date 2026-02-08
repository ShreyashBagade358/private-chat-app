# 🌐 Production Deployment Guide

This guide covers deploying your SecureChat application to production.

## Table of Contents

1. [Backend Deployment](#backend-deployment)
2. [Frontend Deployment](#frontend-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Security Hardening](#security-hardening)
5. [SSL/HTTPS Setup](#sslhttps-setup)

---

## Backend Deployment

### Option 1: Heroku

1. **Install Heroku CLI**
   ```bash
   # Mac
   brew tap heroku/brew && brew install heroku
   
   # Windows/Linux
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   
   # Login to Heroku
   heroku login
   
   # Create app
   heroku create your-app-name-backend
   
   # Deploy
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   
   # Your backend URL: https://your-app-name-backend.herokuapp.com
   ```

### Option 2: DigitalOcean

1. **Create Droplet**
   - Ubuntu 22.04
   - Minimum: 1GB RAM
   - Add SSH key

2. **SSH into Server**
   ```bash
   ssh root@your-server-ip
   ```

3. **Setup Server**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs
   
   # Install PM2 (process manager)
   npm install -g pm2
   
   # Clone your code
   git clone your-repository-url
   cd private-chat-app/backend
   
   # Install dependencies
   npm install --production
   
   # Start with PM2
   pm2 start server.js --name "chat-backend"
   pm2 startup
   pm2 save
   ```

4. **Setup Nginx as Reverse Proxy**
   ```bash
   apt install -y nginx
   
   # Create nginx config
   nano /etc/nginx/sites-available/chat
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   # Enable site
   ln -s /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

### Option 3: Railway

1. **Sign up at railway.app**

2. **Deploy**
   - Connect your GitHub repository
   - Select backend directory
   - Railway will auto-detect Node.js
   - Click Deploy

3. **Get URL**
   - Railway provides a URL like: `your-app.railway.app`

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Build & Deploy**
   ```bash
   cd frontend
   
   # Update backend URL in src/App.js
   # Change SOCKET_URL to your production backend URL
   
   # Deploy
   vercel
   
   # Follow prompts
   # Your app will be live at: https://your-app.vercel.app
   ```

### Option 2: Netlify

1. **Build the App**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to https://app.netlify.com
   - Drag and drop the `build` folder
   - Or use Netlify CLI:
   
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

### Option 3: AWS S3 + CloudFront

1. **Build the App**
   ```bash
   cd frontend
   npm run build
   ```

2. **Create S3 Bucket**
   - Go to AWS S3 Console
   - Create bucket
   - Enable static website hosting
   - Upload build folder contents

3. **Setup CloudFront**
   - Create CloudFront distribution
   - Set S3 bucket as origin
   - Configure SSL certificate

---

## Environment Configuration

### Backend Environment Variables

Create `.env` file in backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://your-frontend.vercel.app

# Session Configuration
SESSION_TIMEOUT=1800000
MAX_USERS_PER_SESSION=2

# File Upload
MAX_FILE_SIZE=52428800
```

Update `backend/server.js` to use environment variables:

```javascript
require('dotenv').config();

const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: parseInt(process.env.MAX_FILE_SIZE) || 50e6
});

const PORT = process.env.PORT || 5000;
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000;
```

Install dotenv:
```bash
npm install dotenv
```

### Frontend Environment Variables

Create `.env.production` in frontend directory:

```env
REACT_APP_BACKEND_URL=https://your-backend.herokuapp.com
```

Update `frontend/src/App.js`:

```javascript
const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
```

---

## Security Hardening

### 1. Enable HTTPS

**Backend (Nginx):**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal is setup automatically
```

**Update Socket.IO for HTTPS:**

```javascript
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  secure: true
});
```

### 2. Rate Limiting

Install express-rate-limit:

```bash
npm install express-rate-limit
```

Add to `server.js`:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 3. Input Validation

Install validator:

```bash
npm install validator
```

Add validation:

```javascript
const validator = require('validator');

socket.on('send-message', ({ message }) => {
  if (!validator.isLength(message, { min: 1, max: 5000 })) {
    return socket.emit('error', 'Invalid message length');
  }
  // ... rest of code
});
```

### 4. Helmet Security Headers

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 5. Add TURN Server for Better WebRTC

Update call initialization in `ChatRoom.js`:

```javascript
peerConnection.current = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
});
```

You can use free TURN servers or services like:
- Twilio TURN
- Xirsys
- Metered TURN

---

## SSL/HTTPS Setup

### Let's Encrypt (Free SSL)

1. **For Backend on DigitalOcean:**
   ```bash
   certbot --nginx -d api.yourdomain.com
   ```

2. **Auto-renewal:**
   ```bash
   certbot renew --dry-run
   ```

### CloudFlare (Free SSL + CDN)

1. Sign up at cloudflare.com
2. Add your domain
3. Update nameservers
4. Enable "Always Use HTTPS"
5. Set SSL mode to "Full (Strict)"

---

## Post-Deployment Checklist

- [ ] Backend is accessible via HTTPS
- [ ] Frontend is accessible via HTTPS
- [ ] WebSocket connections work (wss://)
- [ ] File uploads work in production
- [ ] Video/Audio calls connect successfully
- [ ] CORS is properly configured
- [ ] Environment variables are set
- [ ] Rate limiting is enabled
- [ ] Error logging is configured
- [ ] Database backups are scheduled (if using DB)
- [ ] Monitoring is setup (e.g., UptimeRobot)
- [ ] Domain DNS is configured
- [ ] SSL certificates are valid
- [ ] CDN is configured (optional)

---

## Monitoring

### Setup Monitoring with PM2

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Monitor Server Resources

```bash
pm2 monit
```

### Setup Alerts

Use services like:
- **UptimeRobot** - Free uptime monitoring
- **Sentry** - Error tracking
- **LogRocket** - Frontend monitoring

---

## Backup & Recovery

### Backup Considerations

Since this app doesn't store persistent data:
- Backup server configurations
- Backup environment variables
- Document deployment procedures
- Keep git repository updated

### Quick Recovery

```bash
# Clone and deploy
git clone your-repo
cd backend
npm install
pm2 start server.js
```

---

## Cost Estimation

**Free Tier Options:**
- Backend: Railway (free tier) or Heroku (hobby tier)
- Frontend: Vercel or Netlify (free)
- Total: $0/month for small usage

**Paid Production:**
- Backend: DigitalOcean Droplet ($6/month)
- Frontend: Vercel Pro ($20/month)
- Domain: $12/year
- TURN Server: $10/month
- Total: ~$38/month

---

## Support

For deployment issues:
- Check server logs: `pm2 logs`
- Check nginx logs: `tail -f /var/log/nginx/error.log`
- Test WebSocket: https://websocketking.com/
- Verify SSL: https://www.ssllabs.com/ssltest/

---

**Good luck with your deployment! 🚀**
