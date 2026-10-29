# Render Deployment Guide - Smart Dine

## Prerequisites
- GitHub account with project pushed to repository
- Render account (free tier available)

## Quick Deployment Steps

### 1. Prepare Your Repository

Ensure your repository structure:
```
smart-dine/
├── backend/
│   ├── requirements.txt
│   ├── app/
│   └── .env.example
├── frontend/
│   ├── package.json
│   ├── .env.production  (Create this manually)
│   └── src/
└── render.yaml
```

### 2. Create Frontend Environment Variable

Create `frontend/.env.production` with:
```
VITE_API_URL=https://smart-dine-backend.onrender.com
```

### 3. Push to GitHub

```bash
git add .
git commit -m "Add render.yaml and deployment config"
git push origin deploy_Oct29
```

### 4. Deploy Using Render Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Select the branch (e.g., `deploy_Oct29`)
5. Render will read `render.yaml` and deploy:
   - PostgreSQL database (smart-dine-db)
   - Python backend (smart-dine-backend)
   - React frontend (smart-dine-frontend)
6. Click **Apply**

### 5. Update CORS Origins (After Deployment)

Once both services are deployed:

1. Get your frontend URL from Render (e.g., `https://smart-dine-frontend.onrender.com`)
2. Go to your backend service in Render
3. Click **Environment** tab
4. Update `CORS_ORIGINS` to your actual frontend URL
5. Update `FRONTEND_PUBLIC_URL` to match
6. Click **Save Changes**

## Environment Variables

### Backend (Auto-configured in render.yaml)
- `DATABASE_URL` - Auto-linked to PostgreSQL
- `SECRET_KEY` - Auto-generated
- `CORS_ORIGINS` - Frontend URL
- `FRONTEND_PUBLIC_URL` - Frontend URL
- `ACCESS_TOKEN_EXPIRE_MINUTES` - 480

### Frontend
- `VITE_API_URL` - Backend URL (set in .env.production)

## Troubleshooting

### Build fails: "No such file: requirements.txt"
- Fixed in render.yaml: `pip install -r backend/requirements.txt`

### CORS errors
- Ensure `CORS_ORIGINS` matches your frontend URL exactly
- No trailing slashes

### Database connection issues
- Ensure database and backend are in the same region
- Use Internal Database URL (Render auto-configures this)

### Frontend build fails
- Ensure `VITE_API_URL` is set in .env.production
- Check that build works locally: `cd frontend && npm run build`

## Free Tier Limitations
- PostgreSQL: Spins down after 90 days of inactivity
- Web Services: Spins down after 15 minutes (30-60s wake time)
- RAM: 512 MB per service

## Manual Deployment (Alternative)

If Blueprint doesn't work, deploy manually:

1. **Database**: New → PostgreSQL → Create
2. **Backend**: New → Web Service → Configure:
   - Build: `pip install -r backend/requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --chdir backend`
   - Env vars: Set DATABASE_URL, SECRET_KEY, CORS_ORIGINS
3. **Frontend**: New → Static Site → Configure:
   - Build: `cd frontend && npm install && npm run build`
   - Publish: `frontend/build`
   - Env vars: VITE_API_URL
