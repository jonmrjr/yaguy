# Railway Deployment Diagnosis & Setup

## Step 1: Check if Backend is Running

Open these URLs in your browser (replace `app.yaguy.com` with your domain):

### 1. Health Check (Most Important!)
```
https://app.yaguy.com/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2024-12-14T..."}
```

If you see this JSON response, **your backend IS running!** 🎉

### 2. Test the Landing Page
```
https://app.yaguy.com/
```

You should see the YaGuy landing page. This is being served by Express, not a "static site."

### 3. Test the API
```
https://app.yaguy.com/api/questions
```

**Expected response:** 401 Unauthorized (because you need to be logged in as admin)
```json
{"error":"No token provided"}
```

If you get this error, it means **your API is working!**

## Step 2: Check Your Environment Variables

In Railway dashboard:
1. Go to your project
2. Click on your service
3. Click "Variables" tab

You should have these set:

```env
NODE_ENV=production
PORT=${{PORT}}
FRONTEND_URL=https://app.yaguy.com
JWT_SECRET=<your-generated-random-string>
JWT_EXPIRES_IN=24h
ADMIN_EMAIL=admin@yaguy.com
STANDARD_SLA_HOURS=24
URGENT_SLA_HOURS=6
STANDARD_PRICE_CENTS=4900
URGENT_PRICE_CENTS=9900
```

**Important Notes:**
- `PORT=${{PORT}}` - Railway provides this automatically, don't change it
- `FRONTEND_URL` - Should match your custom domain
- `JWT_SECRET` - The random string you generated with Node

## Step 3: Check Build Logs

In Railway dashboard:
1. Click "Deployments" tab
2. Click on latest deployment
3. Look for these log messages:

**During Build:**
```
Running migrations...
✓ Migrations complete
```

**During Start:**
```
╔═══════════════════════════════════════╗
║   Ask YaGuy Backend Server Running   ║
╚═══════════════════════════════════════╝
```

## Step 4: Seed the Database

**Problem:** Your database exists but has NO admin user! You need to seed it.

Railway has two options to run the seed command:

### Option A: Using Railway CLI (Recommended)

Install Railway CLI locally:
```bash
npm i -g @railway/cli
railway login
railway link  # Select your project
railway run npm run seed --dir backend
```

### Option B: Temporary Start Command Change

1. In Railway dashboard, go to "Settings"
2. Under "Deploy" → "Start Command", change to:
   ```
   cd backend && npm run seed && npm start
   ```
3. Click "Redeploy"
4. Wait for deployment to complete
5. **IMPORTANT:** Change start command back to:
   ```
   cd backend && npm start
   ```
6. Redeploy again

This will seed the database with:
- **Admin user:** admin@yaguy.com / admin123
- **Test user:** user@example.com / user123

## Step 5: Test Admin Login

1. Go to `https://app.yaguy.com/admin.html`
2. Login with:
   - Email: `admin@yaguy.com`
   - Password: `admin123`
3. You should see the admin dashboard!

## Step 6: Test Full Flow

1. **Submit a question:**
   - Go to `https://app.yaguy.com/ask.html`
   - Fill out the form
   - Submit (payment will be mocked)

2. **View in admin:**
   - Login to admin panel
   - You should see your submitted question
   - Try changing its status
   - Try publishing an answer

## What About PostgreSQL?

Currently using **SQLite** (file-based database). This works but has limitations on Railway:

**SQLite Issues on Railway:**
- ⚠️ Database file might not persist between redeployments
- ⚠️ No persistent volumes by default
- ⚠️ Better for testing, not ideal for production

**PostgreSQL Benefits:**
- ✅ Persistent storage
- ✅ Better performance
- ✅ Railway provides free PostgreSQL
- ✅ Production-ready

**To switch to PostgreSQL later:**
1. Add PostgreSQL service in Railway
2. Railway will provide `DATABASE_URL` variable automatically
3. Update your database configuration to use PostgreSQL
4. Run migrations on PostgreSQL

For now, SQLite will work fine for testing!

## Adding Stripe Keys (When Ready)

Currently in **Mock Mode** - no real payments are processed.

### To Enable Real Stripe:

1. **Get Stripe API keys:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy your **Secret Key** (starts with `sk_test_`)
   - Copy your **Publishable Key** (starts with `pk_test_`)

2. **Add to Railway environment variables:**
   ```env
   STRIPE_SECRET_KEY=sk_test_your_actual_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
   ```

3. **Set up webhook (for payment confirmations):**
   - In Stripe dashboard, go to Webhooks
   - Add endpoint: `https://app.yaguy.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`
   - Copy webhook signing secret
   - Add to Railway:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
     ```

4. **Redeploy** (Railway auto-redeploys when you add env vars)

5. **Test with Stripe test cards:**
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits

## Common Issues & Solutions

### "502 Bad Gateway" Error
- **Cause:** App is starting up or crashed
- **Fix:** Wait 30 seconds. Check logs for errors.
- **Check:** Verify all environment variables are set

### "Can't login to admin"
- **Cause:** Database not seeded
- **Fix:** Run `npm run seed` as described in Step 4

### "API calls failing"
- **Cause:** CORS or environment variable issues
- **Fix:**
  - Check `FRONTEND_URL` matches your domain exactly
  - Check `NODE_ENV=production` is set
  - Look at browser console for errors (F12)

### "Questions not persisting"
- **Cause:** SQLite file not persisting between deploys
- **Fix:** Switch to PostgreSQL (see above)

### "Payment page shows mock/test mode"
- **Cause:** No Stripe keys configured (this is expected!)
- **Fix:** Add Stripe keys when ready (see above)

## What's Currently Missing

Based on your description:

1. ❌ **Database not seeded** - You need to run `npm run seed`
2. ❌ **Stripe keys not added** - App is in mock payment mode
3. ✅ **Environment variables** - You said you added them ✓
4. ✅ **App deployed** - It's running! ✓
5. ⚠️ **PostgreSQL** - Using SQLite (works but not ideal for production)

## Next Steps (Priority Order)

1. **Verify app is running** - Test `/health` endpoint
2. **Seed the database** - Create admin user
3. **Test admin login** - Verify you can access admin panel
4. **Test question submission** - Submit a test question
5. **Add Stripe keys** - When you're ready for real payments
6. **Consider PostgreSQL** - For production persistence

## Quick Verification Checklist

Run through this checklist:

- [ ] `https://app.yaguy.com/health` returns `{"status":"ok"}`
- [ ] Environment variables are set in Railway
- [ ] Build logs show "Migrations complete"
- [ ] Start logs show "Backend Server Running"
- [ ] Database has been seeded
- [ ] Can login to admin panel at `/admin.html`
- [ ] Can submit a test question at `/ask.html`
- [ ] Can see the question in admin panel

If all boxes are checked, your app is fully functional! 🎉

## Getting Help

If something isn't working:
1. Check Railway deployment logs (Dashboard → Deployments → Click deployment)
2. Check browser console for errors (F12 → Console tab)
3. Verify environment variables are set correctly
4. Try the health check endpoint first
