# Ask YaGuy

**Sharp answers on demand** — A paid, high-signal Q&A platform for technical decision-makers.

## Current Status

This repository contains a **static HTML prototype** demonstrating the complete user journey and admin workflow. No backend functionality is currently implemented.

### What's Built (Frontend Only)

- **Landing Page** (`index.html`)
  - Marketing content with value proposition
  - Pricing display ($49 standard / $99 urgent)
  - How it works section
  - Responsive design with Inter font

- **Question Submission** (`ask.html`)
  - Form for email, question title, and details
  - File attachment support (PDF, images, text, markdown)
  - Urgency selection with dynamic pricing display
  - Static form (no submission backend)

- **User Dashboard** (`dashboard.html`)
  - Question list with status badges (Received, In Progress, Answered)
  - Tab filtering (All, Open, Answered)
  - Due date and urgency display
  - Mock data only

- **Question Detail View** (`question.html`)
  - Structured answer format: TL;DR, Detailed reasoning, Concrete steps, Code snippets
  - Question metadata and attachments
  - Status tracking

- **Admin Panel** (`admin.html`)
  - Admin login form
  - Question queue table with filtering
  - Answer composition editor (Markdown support)
  - Status management interface
  - All static, no actual admin functionality

- **Thank You Page** (`thanks.html`)
  - Post-payment confirmation
  - SLA deadline display

- **Styling** (`styles.css`)
  - Modern, clean design system
  - Responsive layout
  - Status badges and card components

## Plan: Full-Fledged Backend System

### Architecture Overview

**Recommended Stack:**
- **Backend Framework:** Node.js with Express/Fastify OR Python with FastAPI/Django
- **Database:** PostgreSQL (relational data + JSON support for flexible schemas)
- **File Storage:** AWS S3 or Cloudinary
- **Payment Processing:** Stripe
- **Email Service:** SendGrid, AWS SES, or Resend
- **Authentication:** JWT tokens + bcrypt password hashing
- **Hosting:** Railway, Render, AWS, or DigitalOcean
- **Frontend Enhancement:** Keep vanilla JS or migrate to React/Vue for dynamic updates

---

### Phase 1: Core Backend Infrastructure

#### 1.1 Database Schema Design

**Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- nullable for magic link only users
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'user' or 'admin'
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  email_verified BOOLEAN DEFAULT FALSE
);
```

**Questions Table**
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL, -- for guest submissions
  title VARCHAR(500) NOT NULL,
  details TEXT NOT NULL,
  urgency VARCHAR(20) NOT NULL, -- 'standard' or 'urgent'
  status VARCHAR(50) DEFAULT 'received', -- received, in_progress, answered, cancelled, refunded
  price_cents INTEGER NOT NULL, -- 4900 or 9900
  stripe_payment_intent_id VARCHAR(255),
  payment_status VARCHAR(50), -- pending, succeeded, failed, refunded
  due_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  answered_at TIMESTAMP,
  answer_text TEXT, -- Markdown format
  admin_notes TEXT
);
```

**Attachments Table**
```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

**Admin Actions Log**
```sql
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action_type VARCHAR(100), -- status_change, answer_published, etc.
  question_id UUID REFERENCES questions(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Email Notifications Table** (optional, for tracking)
```sql
CREATE TABLE email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  question_id UUID REFERENCES questions(id),
  notification_type VARCHAR(100), -- confirmation, answer_delivered, sla_reminder
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) -- sent, failed, bounced
);
```

#### 1.2 Authentication System

**Requirements:**
- User registration with email/password
- Magic link authentication (passwordless option)
- Admin login with secure credentials
- JWT token generation and validation
- Session management
- Password reset flow

**API Endpoints:**
```
POST   /api/auth/register          # Create new user account
POST   /api/auth/login             # Email/password login
POST   /api/auth/magic-link        # Send magic link
GET    /api/auth/verify/:token     # Verify magic link token
POST   /api/auth/logout            # Invalidate token
POST   /api/auth/refresh           # Refresh JWT token
POST   /api/auth/reset-password    # Request password reset
POST   /api/auth/set-password      # Set new password
```

**Security Considerations:**
- Bcrypt for password hashing (cost factor 12+)
- JWT with short expiration (15-30 min access token, 7-day refresh token)
- Rate limiting on auth endpoints (5 attempts per 15 min)
- Email verification required for account activation
- Admin role verification middleware

---

### Phase 2: Payment Integration

#### 2.1 Stripe Integration

**Components:**
- Stripe Checkout Session or Payment Intent API
- Webhook handling for payment events
- Idempotency keys for safe retries
- Refund processing

**Payment Flow:**
1. User submits question form
2. Backend creates Stripe Checkout Session with question metadata
3. User completes payment
4. Stripe webhook confirms payment → Question status set to 'received'
5. Send confirmation email

**API Endpoints:**
```
POST   /api/payments/create-checkout    # Create Stripe checkout session
POST   /api/payments/webhook             # Handle Stripe webhooks
POST   /api/payments/refund/:questionId  # Admin refund (admin only)
GET    /api/payments/status/:questionId  # Check payment status
```

**Webhook Events to Handle:**
- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment confirmed
- `payment_intent.payment_failed` - Payment declined
- `charge.refunded` - Refund processed

**Considerations:**
- Store Stripe customer ID for repeat users
- Handle partial refunds if needed
- Implement webhook signature verification
- Queue webhook processing for reliability (use job queue if high volume)

---

### Phase 3: Question & Answer Management

#### 3.1 Question Submission API

**API Endpoints:**
```
POST   /api/questions              # Submit new question (with file upload)
GET    /api/questions              # List user's questions (authenticated)
GET    /api/questions/:id          # Get single question + answer
PATCH  /api/questions/:id/clarify  # User follow-up (within 24h of answer)
```

**File Upload Handling:**
- Accept multipart/form-data
- Validate file types (.pdf, .txt, .md, .png, .jpg, .jpeg, .gif)
- Limit file size (e.g., 10MB max)
- Scan for malware (ClamAV or cloud service)
- Upload to S3 with presigned URLs for access
- Generate unique filenames to prevent collisions

**Question Submission Process:**
1. Validate input (email, title, details, urgency)
2. Upload attachments to S3
3. Calculate due date (24h or 6h from now)
4. Create payment session
5. Return checkout URL to frontend
6. On payment success webhook → finalize question creation

#### 3.2 Admin Question Management

**API Endpoints (Admin Only):**
```
GET    /api/admin/questions               # Queue with filters (status, urgency, date)
GET    /api/admin/questions/:id           # Full question details
PATCH  /api/admin/questions/:id/status    # Update status
PATCH  /api/admin/questions/:id/answer    # Save draft answer
POST   /api/admin/questions/:id/publish   # Publish answer + send email
GET    /api/admin/analytics               # Dashboard stats
```

**Admin Features:**
- Markdown editor with preview
- Auto-save drafts
- Answer templates
- Question filtering and search
- Bulk status updates
- Export to CSV for reporting

---

### Phase 4: Email Notifications

#### 4.1 Email Templates

**Required Email Types:**
1. **Question Confirmation** - Sent after payment
   - Question summary
   - Due date/SLA
   - Dashboard link

2. **Answer Delivered** - Sent when answer published
   - Answer preview (TL;DR)
   - Link to full answer
   - Follow-up instructions (24h window)

3. **SLA Reminder** (Internal) - Alert admin when deadline approaching
   - 6 hours before due time
   - 1 hour before due time

4. **Payment Receipt** - Stripe handles this, but optional custom version
   - Invoice details
   - Payment confirmation

5. **Password Reset** - For account recovery

6. **Follow-up Submitted** - Confirmation to user, notification to admin

**Email Service Setup:**
- Transactional email provider (SendGrid, Resend, AWS SES)
- HTML templates with fallback text versions
- Unsubscribe handling (for marketing, not transactional)
- Open/click tracking (optional)
- Bounce and complaint handling

**API Endpoints:**
```
POST   /api/emails/test/:type        # Admin test email send
GET    /api/emails/logs              # Email delivery logs (admin)
```

---

### Phase 5: SLA & Scheduling

#### 5.1 Due Date Calculation

**Logic:**
- Standard: Due date = created_at + 24 hours
- Urgent: Due date = created_at + 6 hours
- Adjust for timezone (use UTC internally, display in user's timezone)

#### 5.2 Background Jobs

**Job Queue System** (BullMQ, Agenda, or Celery for Python):

**Jobs:**
1. **SLA Reminder Job** - Runs every 15 minutes
   - Find questions due in < 6 hours with status 'received' or 'in_progress'
   - Send reminder to admin email/Slack

2. **SLA Breach Alert** - Runs every 5 minutes
   - Find questions past due date without answer
   - Send urgent alert to admin
   - Log breach for reporting

3. **Follow-up Window Closer** - Runs daily
   - Mark questions answered > 24h ago as 'closed' (no more follow-ups)

4. **Cleanup Job** - Runs weekly
   - Delete abandoned payment sessions
   - Archive old questions
   - Clean up orphaned files

---

### Phase 6: Security & Infrastructure

#### 6.1 Security Measures

**Input Validation:**
- Sanitize all user input (prevent XSS)
- Validate email formats
- Limit text field lengths
- File upload validation (type, size, content scanning)

**API Security:**
- Rate limiting (express-rate-limit or similar)
  - 5 auth attempts per 15 min
  - 10 question submissions per hour
  - 100 API calls per minute per user
- CORS configuration (whitelist frontend domain)
- Helmet.js for HTTP headers
- SQL injection prevention (use parameterized queries/ORM)
- CSRF protection for state-changing operations

**Data Privacy:**
- Encrypt sensitive data at rest (database encryption)
- Use HTTPS everywhere (TLS 1.2+)
- Secure session cookies (httpOnly, secure, sameSite)
- GDPR compliance: data export, deletion requests
- Log access to sensitive data (admin actions)

**Environment Variables:**
```
DATABASE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
JWT_SECRET
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
EMAIL_API_KEY
ADMIN_EMAIL
NODE_ENV
```

#### 6.2 Error Handling & Logging

- Structured logging (Winston, Pino, or Python logging)
- Error tracking service (Sentry, Rollbar)
- Request/response logging
- Performance monitoring (response times, database queries)
- Health check endpoint: `GET /health`

---

### Phase 7: Frontend Integration

#### 7.1 Update Static HTML to Dynamic

**Changes Required:**
1. Replace form `onsubmit` handlers with API calls
2. Add loading states and error messages
3. Implement client-side form validation
4. Dashboard: Fetch real questions from API
5. Admin panel: Connect to admin API endpoints
6. Add authentication state management
7. Implement file upload progress indicators

**JavaScript Enhancements:**
```javascript
// Example: Question submission
async function submitQuestion(formData) {
  const response = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: formData
  });
  const { checkoutUrl } = await response.json();
  window.location.href = checkoutUrl; // Redirect to Stripe
}
```

#### 7.2 Optional: Migrate to Modern Framework

**Consider React/Next.js or Vue/Nuxt if:**
- Need real-time updates (WebSockets for admin panel)
- Complex state management required
- SEO is critical (Next.js SSR)
- Team prefers component-based architecture

**Keep vanilla JS if:**
- Simplicity is priority
- Team is small
- Static site generation is sufficient

---

### Phase 8: Deployment & DevOps

#### 8.1 Hosting Options

**Backend + Database:**
- **Railway** - Easiest, automatic deployments from GitHub
- **Render** - Similar to Railway, good free tier
- **Fly.io** - Great for global distribution
- **AWS (EC2 + RDS)** - Most flexible, higher complexity
- **DigitalOcean App Platform** - Good balance of ease and control

**Database:**
- Managed PostgreSQL (Railway, Render, AWS RDS, DigitalOcean)
- Supabase (PostgreSQL + built-in auth and storage)
- Neon (serverless Postgres)

**File Storage:**
- AWS S3 (most common)
- Cloudflare R2 (S3-compatible, cheaper egress)
- Cloudinary (image-focused)

**Frontend:**
- Keep on GitHub Pages (if static)
- Vercel or Netlify (if using Next.js/React)
- Same server as backend (simpler deployment)

#### 8.2 CI/CD Pipeline

**GitHub Actions Workflow:**
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: # deployment script
```

**Deployment Steps:**
1. Run tests (unit + integration)
2. Build backend
3. Run database migrations
4. Deploy to staging environment
5. Run smoke tests
6. Deploy to production
7. Send notification (Slack, email)

#### 8.3 Database Migrations

Use a migration tool:
- **Node.js:** Knex.js, Sequelize, or Prisma Migrate
- **Python:** Alembic (for SQLAlchemy) or Django migrations

**Example Migration (Knex):**
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('questions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('users.id').onDelete('CASCADE');
    table.string('title', 500).notNullable();
    // ... more columns
  });
};
```

---

### Phase 9: Monitoring & Analytics

#### 9.1 Application Monitoring

**Metrics to Track:**
- Question submission rate
- Average answer time
- SLA breach rate
- Payment success/failure rates
- API response times
- Error rates
- User retention

**Tools:**
- **APM:** New Relic, DataDog, or open-source (Prometheus + Grafana)
- **Logs:** Papertrail, Logtail, or self-hosted (ELK stack)
- **Uptime:** UptimeRobot, Pingdom, or Checkly

#### 9.2 Business Analytics

**Admin Dashboard Metrics:**
- Questions by status (pie chart)
- Revenue over time (line chart)
- Average response time by urgency
- Top question categories
- User growth rate
- Refund rate

**Implementation:**
- SQL queries for aggregation
- Caching with Redis for expensive queries
- Export to CSV/Excel functionality

---

### Phase 10: Future Enhancements

**After MVP Launch:**
1. **User Accounts**
   - Full registration flow
   - Question history
   - Saved payment methods

2. **Subscription Plans**
   - Monthly question credits
   - Priority support
   - Discounted rates

3. **20-Minute Call Add-On**
   - Calendar integration (Calendly API)
   - Video call links (Zoom, Google Meet)
   - Call notes attached to questions

4. **Answer Templates**
   - Admin-defined response templates
   - Auto-fill common sections

5. **Public Question Archive**
   - Anonymized Q&A library
   - Searchable knowledge base
   - SEO benefit

6. **Real-Time Updates**
   - WebSockets for admin panel
   - Push notifications for users
   - Live status updates

7. **Multi-Expert Routing**
   - Assign questions to specific experts
   - Expert profiles and specializations

8. **Quality Ratings**
   - User rates answers
   - Track expert performance

9. **API for Partners**
   - Public API for question submission
   - Webhooks for status updates
   - API key management

10. **Mobile App**
    - React Native or Flutter
    - Push notifications
    - Optimized for on-the-go access

---

## Development Timeline Estimate

**Phase 1-3 (Core Backend + Payments):** 3-4 weeks
**Phase 4-5 (Emails + SLA):** 1-2 weeks
**Phase 6 (Security Hardening):** 1 week
**Phase 7 (Frontend Integration):** 2-3 weeks
**Phase 8 (Deployment + DevOps):** 1 week
**Phase 9 (Monitoring):** 1 week
**Testing + Bug Fixes:** 2 weeks

**Total MVP:** ~10-14 weeks (2.5-3.5 months) for single full-stack developer

---

## Getting Started (Once Backend is Built)

### Local Development Setup

```bash
# Clone repository
git clone <repo-url>
cd yaguy

# Backend setup
cd backend
npm install  # or pip install -r requirements.txt for Python
cp .env.example .env  # Configure environment variables

# Database setup
createdb yaguy_dev
npm run migrate  # Run migrations

# Start backend
npm run dev  # Runs on http://localhost:3000

# Frontend (in separate terminal)
cd ../frontend
# If using build tool, otherwise serve static files
python -m http.server 8000  # Or use Live Server in VS Code
```

### Environment Configuration

```bash
# .env file
DATABASE_URL=postgresql://user:pass@localhost:5432/yaguy_dev
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=your-256-bit-secret
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
EMAIL_API_KEY=...
ADMIN_EMAIL=admin@yaguy.com
NODE_ENV=development
```

---

## API Documentation

Once implemented, API documentation should be generated with:
- **Swagger/OpenAPI** - Interactive API docs
- **Postman Collection** - Pre-configured API requests
- Endpoint reference with request/response examples

---

## Contributing

(Add contribution guidelines once backend development begins)

---

## License

(Specify license)

---

## Contact

For questions about Ask YaGuy: hello@yaguy.com
