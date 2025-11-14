#!/bin/bash

# Test script for Ask YaGuy backend
# This script tests the complete user and admin flow

BASE_URL="http://localhost:3000/api"
echo "======================================"
echo "Ask YaGuy Backend Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "Test 1: Health Check"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed (HTTP $response)${NC}"
  exit 1
fi
echo ""

# Test 2: Admin Login
echo "Test 2: Admin Login"
login_response=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yaguy.com","password":"admin123"}')

admin_token=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$admin_token" ]; then
  echo -e "${GREEN}✓ Admin login successful${NC}"
  echo "Token: ${admin_token:0:20}..."
else
  echo -e "${RED}✗ Admin login failed${NC}"
  echo "Response: $login_response"
  exit 1
fi
echo ""

# Test 3: Get Dashboard Stats (Empty)
echo "Test 3: Get Dashboard Stats"
stats_response=$(curl -s $BASE_URL/questions/admin/stats \
  -H "Authorization: Bearer $admin_token")

total=$(echo $stats_response | grep -o '"total":[0-9]*' | cut -d':' -f2)

if [ "$total" = "0" ]; then
  echo -e "${GREEN}✓ Dashboard stats retrieved (empty as expected)${NC}"
else
  echo -e "${YELLOW}⚠ Dashboard stats shows $total questions${NC}"
fi
echo ""

# Test 4: Submit a Question
echo "Test 4: Submit a Question"
question_response=$(curl -s -X POST $BASE_URL/questions \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "title": "How to optimize PostgreSQL queries?",
    "details": "We have a large table with millions of rows and queries are slow. What indexing strategies should we use?",
    "urgency": "standard"
  }')

question_id=$(echo $question_response | grep -o '"questionId":"[^"]*' | cut -d'"' -f4)
checkout_url=$(echo $question_response | grep -o '"checkoutUrl":"[^"]*' | cut -d'"' -f4)

if [ -n "$question_id" ]; then
  echo -e "${GREEN}✓ Question submitted${NC}"
  echo "Question ID: $question_id"
  echo "Checkout URL: ${checkout_url:0:50}..."
else
  echo -e "${RED}✗ Question submission failed${NC}"
  echo "Response: $question_response"
  exit 1
fi
echo ""

# Test 5: Get All Questions (Admin)
echo "Test 5: Get All Questions (Admin)"
questions_response=$(curl -s $BASE_URL/questions \
  -H "Authorization: Bearer $admin_token")

question_count=$(echo $questions_response | grep -o '"questions":\[' | wc -l)

if [ "$question_count" -gt "0" ]; then
  echo -e "${GREEN}✓ Questions retrieved${NC}"
  echo "Response preview: ${questions_response:0:100}..."
else
  echo -e "${RED}✗ Failed to retrieve questions${NC}"
  echo "Response: $questions_response"
  exit 1
fi
echo ""

# Test 6: Update Question Status
echo "Test 6: Update Question Status to 'in_progress'"
status_response=$(curl -s -X PATCH $BASE_URL/questions/$question_id/status \
  -H "Authorization: Bearer $admin_token" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}')

new_status=$(echo $status_response | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ "$new_status" = "in_progress" ]; then
  echo -e "${GREEN}✓ Status updated to in_progress${NC}"
else
  echo -e "${RED}✗ Status update failed${NC}"
  echo "Response: $status_response"
  exit 1
fi
echo ""

# Test 7: Publish Answer
echo "Test 7: Publish Answer"
answer_response=$(curl -s -X POST $BASE_URL/questions/$question_id/publish-answer \
  -H "Authorization: Bearer $admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "answer_text": "## TL;DR\n\nUse composite indexes on frequently queried columns, partition large tables, and implement query caching.\n\n## Detailed Answer\n\n1. Analyze query patterns using EXPLAIN ANALYZE\n2. Create B-tree indexes on WHERE clause columns\n3. Consider partial indexes for specific conditions\n4. Implement table partitioning for time-series data\n5. Use connection pooling (pgbouncer)\n\n## Implementation Steps\n\n- Run pg_stat_statements extension\n- Identify slow queries\n- Create appropriate indexes\n- Monitor query performance improvements"
  }')

answer_status=$(echo $answer_response | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ "$answer_status" = "answered" ]; then
  echo -e "${GREEN}✓ Answer published successfully${NC}"
else
  echo -e "${RED}✗ Answer publishing failed${NC}"
  echo "Response: $answer_response"
  exit 1
fi
echo ""

# Test 8: Get Updated Stats
echo "Test 8: Get Updated Dashboard Stats"
final_stats=$(curl -s $BASE_URL/questions/admin/stats \
  -H "Authorization: Bearer $admin_token")

answered_count=$(echo $final_stats | grep -o '"answered":[0-9]*' | cut -d':' -f2)

if [ "$answered_count" -gt "0" ]; then
  echo -e "${GREEN}✓ Stats updated correctly${NC}"
  echo "Stats: $final_stats"
else
  echo -e "${YELLOW}⚠ Stats may not have updated yet${NC}"
  echo "Stats: $final_stats"
fi
echo ""

# Test 9: Check Email Notifications
echo "Test 9: Check Email Notifications"
if [ -d "../backend/emails_sent" ]; then
  email_count=$(ls -1 ../backend/emails_sent/*.json 2>/dev/null | wc -l)
  if [ "$email_count" -gt "0" ]; then
    echo -e "${GREEN}✓ $email_count email notification(s) generated${NC}"
    echo "Email files:"
    ls -1 ../backend/emails_sent/*.json | tail -2
  else
    echo -e "${YELLOW}⚠ No email notifications found${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Email directory not found${NC}"
fi
echo ""

# Summary
echo "======================================"
echo "Test Suite Summary"
echo "======================================"
echo -e "${GREEN}All critical tests passed!${NC}"
echo ""
echo "Manual testing checklist:"
echo "1. Open http://localhost:8000/ask.html and submit a question"
echo "2. Open http://localhost:3000 in browser to verify CORS"
echo "3. Login to admin panel at http://localhost:8000/admin.html"
echo "   - Email: admin@yaguy.com"
echo "   - Password: admin123"
echo "4. Check emails in backend/emails_sent/"
echo ""
