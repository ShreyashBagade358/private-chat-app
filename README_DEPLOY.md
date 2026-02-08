Deployment guide: Vercel (frontend) + Fly.io (backend)

Overview
- Frontend: deploy to Vercel (Create React App)
- Backend: deploy to Fly.io as a Docker container (supports WebSockets/socket.io)

1) Frontend → Vercel
- In the Vercel dashboard, import the repository and select the `frontend` project root.
- Set build command: `npm run build`
- Set output directory: `build`
- Add Environment Variable in Vercel Project Settings:
  - `REACT_APP_SOCKET_URL` = https://<your-backend-app>.fly.dev
- Deploy (Vercel will build and publish). After deploy, your frontend will be available at `https://<your-vercel-app>.vercel.app`.

2) Backend → Fly.io
Prereqs: install `flyctl` (https://fly.io/docs/hands-on/install-flyctl/)

Basic steps (from repo root):

# build and test image locally (optional)
cd backend
docker build -t private-chat-backend:latest .
# run locally
docker run -e PORT=5000 -p 5000:5000 private-chat-backend:latest

# deploy to Fly.io
flyctl launch --name private-chat-backend --image private-chat-backend:latest
# or if you want fly to build from the repo (it will detect Dockerfile)
cd backend
flyctl launch

# set allowed origin (your frontend domain)
flyctl secrets set ALLOWED_ORIGIN=https://<your-vercel-app>.vercel.app

# deploy
flyctl deploy

Notes
- Ensure `REACT_APP_SOCKET_URL` in Vercel points to your Fly app URL (https://<appname>.fly.dev).
- Set `ALLOWED_ORIGIN` on Fly to your Vercel domain so socket.io CORS allows connections.
- Fly provides a free tier; check Fly docs for persistent volumes and scaling.

Alternative hosts for backend: Render, Railway, DigitalOcean App Platform. All support long-lived WebSocket connections.
