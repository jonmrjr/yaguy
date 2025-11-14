#!/bin/bash

# Railway Deployment Test Script
# Tests your deployed app on Railway

DOMAIN="${1:-app.yaguy.com}"
BASE_URL="https://$DOMAIN"

echo "╔════════════════════════════════════════════╗"
echo "║  Testing Railway Deployment: $DOMAIN  "
echo "╚════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "Test 1: Health Check"
echo "-------------------"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Backend is running!${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}✗ Backend is not responding correctly${NC}"
  echo "HTTP Code: $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Landing Page
echo "Test 2: Landing Page"
echo "-------------------"
LANDING_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$LANDING_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ Landing page is accessible${NC}"
else
  echo -e "${RED}✗ Landing page returned HTTP $LANDING_RESPONSE${NC}"
fi
echo ""

# Test 3: API Endpoint (Should return 401 without auth)
echo "Test 3: API Endpoint"
echo "-------------------"
API_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/questions")
HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)
BODY=$(echo "$API_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ API is working (401 Unauthorized is expected)${NC}"
  echo "Response: $BODY"
elif [ "$HTTP_CODE" = "200" ]; then
  echo -e "${YELLOW}⚠ API returned 200 (you might be logged in)${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}✗ API returned unexpected status: $HTTP_CODE${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 4: Admin Page
echo "Test 4: Admin Page"
echo "-------------------"
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin.html")
if [ "$ADMIN_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ Admin page is accessible${NC}"
else
  echo -e "${RED}✗ Admin page returned HTTP $ADMIN_RESPONSE${NC}"
fi
echo ""

# Test 5: Ask Page
echo "Test 5: Ask Page"
echo "-------------------"
ASK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ask.html")
if [ "$ASK_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ Ask page is accessible${NC}"
else
  echo -e "${RED}✗ Ask page returned HTTP $ASK_RESPONSE${NC}"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════╗"
echo "║              Test Summary                  ║"
echo "╚════════════════════════════════════════════╝"
echo ""

if [ "$HTTP_CODE" = "200" ] && [ "$LANDING_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ Your app is deployed and running!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Seed the database with: railway run npm run seed --dir backend"
  echo "2. Try logging in to admin: $BASE_URL/admin.html"
  echo "   Email: admin@yaguy.com"
  echo "   Password: admin123"
  echo "3. Submit a test question: $BASE_URL/ask.html"
else
  echo -e "${RED}✗ There are issues with your deployment${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check Railway deployment logs"
  echo "2. Verify environment variables are set"
  echo "3. Check that NODE_ENV=production"
  echo "4. Review RAILWAY_DIAGNOSIS.md for detailed help"
fi
echo ""

echo "Useful URLs:"
echo "  Landing:  $BASE_URL/"
echo "  Ask:      $BASE_URL/ask.html"
echo "  Admin:    $BASE_URL/admin.html"
echo "  Health:   $BASE_URL/health"
echo "  API:      $BASE_URL/api/"
