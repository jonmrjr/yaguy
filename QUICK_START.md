# Quick Start - Railway Deployment

## Is Your App Running?

Run this test script:
```bash
./test-deployment.sh app.yaguy.com
```

Or manually test:
```bash
curl https://app.yaguy.com/health
```

If you see `{"status":"ok"}` → **Your app IS running!** ✅

## What You're Seeing

The "static site" you see IS your app! The Express backend serves the frontend HTML files in production. This is correct behavior.

## What's Missing

1. **Database not seeded** - No admin user yet
2. **Stripe keys not added** - Using mock payments

## Fix #1: Seed the Database

You need to create the admin user. Choose one method:

### Method A: Railway CLI (Easiest)
```bash
npm i -g @railway/cli
railway login
railway link
railway run npm run seed --dir backend
```

### Method B: Via Railway Dashboard
1. Go to Railway project → Settings
2. Change "Start Command" to: `cd backend && npm run seed && npm start`
3. Redeploy
4. Wait for it to complete
5. Change back to: `cd backend && npm start`
6. Redeploy again

## Fix #2: Test Admin Login

1. Go to https://app.yaguy.com/admin.html
2. Login:
   - Email: `admin@yaguy.com`
   - Password: `admin123`

If login works → **You're all set!** 🎉

## Adding Stripe (When Ready)

### Get Stripe Test Keys
1. Visit https://dashboard.stripe.com/test/apikeys
2. Copy Secret Key (sk_test_...)
3. Copy Publishable Key (pk_test_...)

### Add to Railway
1. Go to Railway → Variables tab
2. Add:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   ```
3. Railway auto-redeploys

### Test Payments
Use Stripe test card:
- Card: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits

## Environment Variables Checklist

Make sure these are set in Railway → Variables:

- [ ] `NODE_ENV=production`
- [ ] `PORT=${{PORT}}` (Railway provides this)
- [ ] `FRONTEND_URL=https://app.yaguy.com`
- [ ] `JWT_SECRET=<your-random-string>`
- [ ] `JWT_EXPIRES_IN=24h`
- [ ] `ADMIN_EMAIL=admin@yaguy.com`
- [ ] `STANDARD_SLA_HOURS=24`
- [ ] `URGENT_SLA_HOURS=6`
- [ ] `STANDARD_PRICE_CENTS=4900`
- [ ] `URGENT_PRICE_CENTS=9900`

Optional (add when ready):
- [ ] `STRIPE_SECRET_KEY=sk_test_...`
- [ ] `STRIPE_PUBLISHABLE_KEY=pk_test_...`

## Verification Steps

1. ✓ Health check: https://app.yaguy.com/health
2. ✓ Landing page: https://app.yaguy.com/
3. ✓ Admin login: https://app.yaguy.com/admin.html
4. ✓ Submit question: https://app.yaguy.com/ask.html
5. ✓ View in admin panel

## Need More Help?

- Read `RAILWAY_DIAGNOSIS.md` for detailed troubleshooting
- Check Railway logs: Dashboard → Deployments → Click latest
- Run the test script: `./test-deployment.sh app.yaguy.com`

## PostgreSQL (Optional)

Currently using SQLite (works fine for testing).

To add PostgreSQL for production:
1. Railway Dashboard → Add Service → PostgreSQL
2. Railway auto-adds `DATABASE_URL` variable
3. Update database config to use PostgreSQL
4. Run migrations on PostgreSQL

For now, SQLite works! Don't worry about this until you need it.
