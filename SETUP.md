# Ask YaGuy - Setup Guide

This document explains how to set up and run the Ask YaGuy application locally.

## 🎯 What's Implemented

This is a **minimal running product** with:

- ✅ **Backend API** (Node.js + Express)
- ✅ **Database** (SQLite with migrations)
- ✅ **Authentication** (JWT + bcrypt)
- ✅ **Payment Processing** (Mock Stripe for development)
- ✅ **Question Management** (Submit, view, answer)
- ✅ **Admin Panel** (Manage questions, publish answers)
- ✅ **Email Notifications** (File-based mock)
- ✅ **Frontend Integration** (Static HTML connected to API)

## 📋 Prerequisites

- Node.js 18+ and npm
- Git (for version control)
- A web browser

## 🚀 Quick Start

### 1. Clone and Navigate

```bash
cd /home/user/yaguy
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Set Up Database

```bash
# Run migrations
npm run migrate

# Seed with test users
npm run seed
```

### 4. Start the Backend Server

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════╗
║   Ask YaGuy Backend Server Running   ║
╚═══════════════════════════════════════╝

🚀 Server: http://localhost:3000
📝 Health: http://localhost:3000/health
🔐 Auth API: http://localhost:3000/api/auth
❓ Questions API: http://localhost:3000/api/questions
🌐 Frontend: http://localhost:8000

Default Admin Credentials:
  Email: admin@yaguy.com
  Password: admin123

Test User Credentials:
  Email: user@example.com
  Password: user123
```

### 5. Serve the Frontend

In a new terminal:

```bash
# Option 1: Python 3
python3 -m http.server 8000

# Option 2: Node.js (if you have http-server installed)
npx http-server -p 8000
```

### 6. Open in Browser

- **Landing Page**: http://localhost:8000/index.html
- **Submit Question**: http://localhost:8000/ask.html
- **Admin Panel**: http://localhost:8000/admin.html

## 🧪 Testing

### Run Automated Tests

```bash
cd backend
./test-flow.sh
```

This will test:
- ✓ Health check
- ✓ Admin login
- ✓ Question submission
- ✓ Admin question management
- ✓ Status updates
- ✓ Answer publishing
- ✓ Email notifications

### Manual Testing Workflow

#### User Flow:

1. Open http://localhost:8000/ask.html
2. Fill in the form:
   - Email: your@email.com
   - Title: "How to scale my database?"
   - Details: "We have 10M records..."
   - Urgency: Standard or Urgent
3. Click "Continue to Payment"
4. You'll be redirected to a mock payment page (since Stripe is mocked)
5. Question is now in the system!

#### Admin Flow:

1. Open http://localhost:8000/admin.html
2. Login with:
   - Email: admin@yaguy.com
   - Password: admin123
3. You'll see the questions queue
4. Click on a question to view details
5. Change status to "In Progress"
6. Write an answer in Markdown
7. Click "Publish Answer"
8. Check `backend/emails_sent/` for the notification email

## 📁 Project Structure

```
yaguy/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Authentication middleware
│   │   ├── models/         # (Future: Data models)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (Email, Stripe)
│   │   ├── utils/          # JWT utilities
│   │   └── server.js       # Express server
│   ├── database.sqlite     # SQLite database file
│   ├── emails_sent/        # Mock email storage
│   ├── package.json        # Dependencies
│   ├── .env                # Environment variables
│   └── test-flow.sh        # E2E test script
├── api-client.js           # Frontend API client
├── index.html              # Landing page
├── ask.html                # Question submission
├── admin.html              # Admin panel
├── dashboard.html          # User dashboard (WIP)
├── question.html           # Question detail view (WIP)
├── thanks.html             # Post-payment page
└── styles.css              # Global styles
```

## 🔑 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/profile` - Get current user (requires auth)

### Questions

- `POST /api/questions` - Submit question
- `POST /api/questions/confirm-payment` - Confirm payment
- `GET /api/questions/my-questions` - Get user's questions (requires auth)
- `GET /api/questions/:id` - Get single question

### Admin (requires admin role)

- `GET /api/questions` - Get all questions
- `PATCH /api/questions/:id/status` - Update status
- `POST /api/questions/:id/publish-answer` - Publish answer
- `GET /api/questions/admin/stats` - Dashboard statistics

## 💾 Database

Uses SQLite with the following tables:

- `users` - User accounts
- `questions` - Submitted questions
- `attachments` - File uploads (future)
- `admin_actions` - Audit log
- `email_notifications` - Email tracking

View database:

```bash
sqlite3 backend/database.sqlite
.tables
SELECT * FROM questions;
SELECT * FROM users;
.quit
```

## 🔧 Configuration

Edit `backend/.env`:

```env
# Server
PORT=3000
FRONTEND_URL=http://localhost:8000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Stripe (leave commented for mock mode)
# STRIPE_SECRET_KEY=sk_test_your_key

# Email
ADMIN_EMAIL=admin@yaguy.com

# Pricing
STANDARD_PRICE_CENTS=4900  # $49
URGENT_PRICE_CENTS=9900    # $99
```

## 🎨 Mock vs Real Services

### Stripe

Currently using **Mock Mode** (no real payments):
- Questions are created with a mock checkout URL
- Payment is automatically marked as successful
- No actual Stripe API calls

To enable real Stripe:
1. Get API keys from https://dashboard.stripe.com/test/apikeys
2. Uncomment and set in `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_your_actual_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### Email

Currently using **File-Based Mock**:
- Emails are saved to `backend/emails_sent/` as JSON
- Each email contains: to, subject, html, text, timestamp
- No actual emails sent

To enable real email (SendGrid example):
1. Get API key from SendGrid
2. Update `backend/src/services/emailService.js` to use nodemailer with SendGrid
3. Add `SENDGRID_API_KEY` to `.env`

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### Database Issues

```bash
# Reset database
rm backend/database.sqlite
npm run migrate
npm run seed
```

### CORS Errors

Make sure frontend is on http://localhost:8000 (configured in `.env`)

### Can't Login to Admin

Default credentials:
- Email: admin@yaguy.com
- Password: admin123

If forgotten, reseed:
```bash
npm run seed
```

## 📝 Next Steps

To make this production-ready:

1. **Real Stripe Integration** - Add actual payment processing
2. **Real Email Service** - Integrate SendGrid/SES
3. **File Uploads** - Implement attachment storage (S3/local)
4. **User Dashboard** - Connect dashboard.html to API
5. **Question Detail Page** - Connect question.html to API
6. **PostgreSQL** - Switch from SQLite to PostgreSQL
7. **Deployment** - Deploy to Railway, Render, or AWS
8. **Security Hardening** - Rate limiting, input validation
9. **Testing** - Unit tests, integration tests
10. **Monitoring** - Error tracking, performance monitoring

## 🤝 Contributing

This is a work in progress! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

(Add your license here)
