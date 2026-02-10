# Render + Vercel Deployment Guide

## Overview
Deploy your backend to **Render** (supports WebSockets) and frontend to **Vercel**.

## Part 1: Deploy Backend to Render

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Create Render Account
1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub repository

### Step 3: Create Web Service
1. Click **New +** → **Web Service**
2. Connect your repository
3. Configure:
   - **Name**: `private-chat-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

### Step 4: Set Environment Variables
Add these in Render Dashboard → Your Service → Environment:
```
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### Step 5: Deploy
Click **Deploy**. Once complete, note your Render URL (e.g., `https://private-chat-backend.onrender.com`).

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
Sign up at [vercel.com](https://vercel.com)

### Step 2: Import Project
1. Click **Add New Project**
2. Import your Git repository
3. Set **Root Directory**: `frontend`

### Step 3: Configure Build Settings
- **Framework Preset**: Create React App
- **Build Command**: `npm run build`
- **Output Directory**: `build`

### Step 4: Set Environment Variable
Add in Vercel Dashboard → Project Settings → Environment Variables:
```
REACT_APP_BACKEND_URL=https://your-render-backend-url.onrender.com
```

### Step 5: Deploy
Click **Deploy**. Note your Vercel URL (e.g., `https://private-chat-app.vercel.app`).

---

## Part 3: Update Backend CORS (IMPORTANT!)

After getting your Vercel URL, update Render environment variables:

1. Go to Render Dashboard → Your Service → Environment
2. Add/update:
```
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
```
3. Click **Save Changes** (auto-redeploys)

---

## Verification

### Test Backend
```bash
curl https://your-render-backend.onrender.com/health
```

### Test Frontend
1. Visit your Vercel URL
2. Check browser console for connection status
3. Create and join sessions

---

## Troubleshooting

### WebSocket Connection Failed
- Check Render service is running
- Verify `FRONTEND_URL` in Render matches your Vercel URL exactly
- Check browser console for CORS errors
- Ensure `REACT_APP_BACKEND_URL` in Vercel starts with `https://`

### CORS Errors
```
Access-Control-Allow-Origin header missing
```
**Solution**: Update `FRONTEND_URL` in Render environment variables with your exact Vercel URL.

### Connection Timeout
- Render free tier spins down after 15 min inactivity
- First connection may take 30-60 seconds to wake up

---

## Alternative: Deploy Frontend on Render Too

If you prefer both on Render:

1. In `render.yaml`, uncomment the static site section
2. Push to trigger deployment
3. Frontend URL will be auto-configured

---

## Security Checklist

- [ ] Backend uses `https://`
- [ ] Environment variables set correctly
- [ ] CORS origins restricted (not `*`)
- [ ] No secrets committed to Git

---

**You're all set! 🚀**
