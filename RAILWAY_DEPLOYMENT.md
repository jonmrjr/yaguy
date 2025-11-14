# Railway Deployment Guide

This guide walks you through deploying Ask YaGuy to Railway, which will host both the backend API and frontend on a single domain.

## 🚂 What is Railway?

Railway is a platform that makes deploying apps easy. It will:
- Auto-detect your Node.js app
- Provide a PostgreSQL database (optional, we're using SQLite for now)
- Give you a URL like `https://yaguy.up.railway.app`
- Auto-deploy when you push to GitHub
- Provide free tier (500 hours/month, $5 credit)

## 📋 Prerequisites

1. GitHub account (you already have this)
2. Railway account - Sign up at https://railway.app (free, use GitHub to sign in)

## 🚀 Deployment Steps

### Step 1: Sign Up for Railway

1. Go to https://railway.app
2. Click "Login" and use your GitHub account
3. Authorize Railway to access your repositories

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `jonmrjr/yaguy` repository
4. Select the branch: `claude/implement-minimal-product-01352UN7Rh9GuKwjL4Y43Sjx`

### Step 3: Configure Environment Variables

Railway will auto-detect Node.js. Now add environment variables:

1. In your Railway project, click on your service
2. Go to "Variables" tab
3. Add these variables:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=${{RAILWAY_PUBLIC_DOMAIN}}
JWT_SECRET=generate-a-random-256-bit-string-here
JWT_EXPIRES_IN=24h
ADMIN_EMAIL=admin@yaguy.com
STANDARD_SLA_HOURS=24
URGENT_SLA_HOURS=6
STANDARD_PRICE_CENTS=4900
URGENT_PRICE_CENTS=9900
```

**Important:** Railway provides `${{RAILWAY_PUBLIC_DOMAIN}}` as a special variable that auto-resolves to your deployment URL.

### Step 4: Generate JWT Secret

For the `JWT_SECRET`, generate a secure random string:

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 32

# Option 3: Online
# Visit https://www.random.org/strings/
```

Copy the output and use it as your JWT_SECRET.

### Step 5: Deploy!

Railway will automatically:
1. Install dependencies (`npm install`)
2. Run migrations (`npm run migrate`)
3. Start the server (`npm start`)
4. Expose it on a public URL

### Step 6: Set Up Custom Domain (Optional)

1. In Railway project, go to "Settings"
2. Click "Generate Domain" for a Railway subdomain (e.g., `yaguy.up.railway.app`)
3. Or add your own custom domain if you have one

### Step 7: Seed the Database

Once deployed, you need to add the admin user. Railway provides a way to run commands:

1. Go to your Railway project
2. Click on the service
3. Go to "Settings" → "Deploy" section
4. Under "Start Command", temporarily change to:
   ```
   cd backend && npm run seed && npm start
   ```
5. Redeploy
6. After it runs once, change it back to:
   ```
   cd backend && npm start
   ```

**Or** use Railway's shell:
1. Click on your service
2. Go to "Shell" tab (if available)
3. Run:
   ```bash
   cd backend && npm run seed
   ```

## 🧪 Testing Your Deployment

Once deployed, test these URLs (replace with your Railway domain):

```bash
# Health check
curl https://yaguy.up.railway.app/health

# Frontend
open https://yaguy.up.railway.app

# Admin panel
open https://yaguy.up.railway.app/admin.html
```

### Test the Full Flow:

1. **Visit Landing Page**: https://your-app.up.railway.app
2. **Submit a Question**: Go to `/ask.html` and submit a test question
3. **Login to Admin**: Go to `/admin.html`
   - Email: `admin@yaguy.com`
   - Password: `admin123`
4. **Manage Questions**: View, update status, publish answer

## 🔧 How It Works in Production

### Environment Detection

The app automatically detects the environment:

**Frontend (`api-client.js`)**:
```javascript
// On localhost → uses http://localhost:3000/api
// On Railway → uses https://your-app.up.railway.app/api
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : window.location.origin + '/api';
```

**Backend (`server.js`)**:
- Serves static frontend files when `NODE_ENV=production`
- CORS allows same-origin requests
- All routes work under one domain

### URL Structure

**Local Development:**
- Frontend: http://localhost:8000 (Python/http-server)
- Backend: http://localhost:3000 (Express)

**Railway Production:**
- Everything: https://your-app.up.railway.app
  - `/` → index.html (frontend)
  - `/ask.html` → question form
  - `/admin.html` → admin panel
  - `/api/*` → backend API
  - `/health` → health check

## 📊 Monitoring

### View Logs

1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Click on a deployment to see logs

### Check Database

Railway doesn't have a built-in SQLite viewer, but you can:

1. Add a database viewer endpoint (for admin only)
2. Download the SQLite file via Railway CLI
3. Switch to PostgreSQL (Railway provides free PostgreSQL)

## 💰 Costs

Railway free tier includes:
- **$5 credit/month** (usually enough for small apps)
- **500 execution hours/month**
- If your app runs 24/7, that's ~20 days
- They'll notify you when approaching limits

To optimize:
- App sleeps after inactivity (Railway does this automatically)
- First request after sleep takes ~30 seconds to wake up
- Keep app awake with uptime monitors (optional)

## 🔄 Continuous Deployment

Once set up, Railway auto-deploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Add new feature"
git push origin your-branch

# Railway automatically:
# 1. Detects the push
# 2. Builds the app
# 3. Runs migrations
# 4. Deploys the new version
```

## 🐛 Troubleshooting

### App Won't Start

Check logs in Railway dashboard. Common issues:
- Missing environment variables
- Database migration failed
- Port conflicts (Railway sets PORT automatically)

### 502 Bad Gateway

- App is starting up (wait 30 seconds)
- Check logs for errors
- Ensure PORT is not hardcoded to 3000

### API Calls Failing

- Check CORS settings
- Verify `FRONTEND_URL` is set correctly
- Check browser console for errors

### Database Issues

- SQLite file might not persist between deploys
- **Solution**: Switch to PostgreSQL for production
- Or use Railway's persistent volumes (advanced)

## 🎯 Next Steps After Deployment

1. **Switch to PostgreSQL** (recommended for production)
   - Railway provides free PostgreSQL
   - Update database config
   - Run migrations on PostgreSQL

2. **Add Real Stripe**
   - Get Stripe API keys
   - Add to Railway environment variables
   - Test payment flow

3. **Add Real Email Service**
   - Sign up for SendGrid/AWS SES
   - Add API keys to Railway
   - Update email service

4. **Custom Domain**
   - Buy a domain (Namecheap, Google Domains)
   - Point to Railway
   - Add SSL (automatic)

5. **Monitoring**
   - Add Sentry for error tracking
   - Add uptime monitoring (UptimeRobot)
   - Set up Railway notifications

## 📚 Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Node.js on Railway**: https://docs.railway.app/guides/nodejs

## ❓ Need Help?

If you get stuck:
1. Check Railway logs (Dashboard → Service → Deployments)
2. Review this guide
3. Check Railway Discord
4. Review `SETUP.md` for local dev setup

---

## 🎉 You're Live!

Once deployed, your app is:
- ✅ Accessible worldwide
- ✅ Auto-scaling
- ✅ Auto-deploying on git push
- ✅ HTTPS enabled
- ✅ Backend + Frontend on one domain

Share your live URL: `https://your-app.up.railway.app`
