#!/bin/bash

# XBRL API Minimal - Production Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENV=${1:-staging}

echo -e "${GREEN}🚀 XBRL API Deployment Script${NC}"
echo -e "${YELLOW}Environment: $ENV${NC}"
echo ""

# Validate environment
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env.$ENV" ]; then
    echo "Loading environment variables from .env.$ENV"
    export $(cat .env.$ENV | grep -v '^#' | xargs)
fi

# Step 1: Run tests
echo -e "${YELLOW}Step 1: Running tests...${NC}"
npm run test:ci
if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed! Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Tests passed${NC}"

# Step 2: Type checking
echo -e "${YELLOW}Step 2: Type checking...${NC}"
npm run type-check
if [ $? -ne 0 ]; then
    echo -e "${RED}Type checking failed! Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Type checking passed${NC}"

# Step 3: Lint checking
echo -e "${YELLOW}Step 3: Linting...${NC}"
npm run lint
if [ $? -ne 0 ]; then
    echo -e "${RED}Linting failed! Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Linting passed${NC}"

# Step 4: Build application
echo -e "${YELLOW}Step 4: Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

# Step 5: Database migrations
echo -e "${YELLOW}Step 5: Running database migrations...${NC}"
if [ "$ENV" == "production" ]; then
    echo "Running production migrations..."
    npx supabase db push --project-ref wpwqxhyiglbtlaimrjrx
else
    echo "Skipping migrations for staging..."
fi
echo -e "${GREEN}✓ Migrations complete${NC}"

# Step 6: Deploy to Vercel
echo -e "${YELLOW}Step 6: Deploying to Vercel...${NC}"
if [ "$ENV" == "production" ]; then
    vercel --prod --yes
else
    vercel --yes
fi
echo -e "${GREEN}✓ Deployment complete${NC}"

# Step 7: Health check
echo -e "${YELLOW}Step 7: Running health check...${NC}"
sleep 10 # Wait for deployment to be ready

if [ "$ENV" == "production" ]; then
    HEALTH_URL="https://api.xbrl-data.com/api/health"
else
    HEALTH_URL="https://staging.xbrl-data.com/api/health"
fi

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$HEALTH_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}Health check failed with status: $HEALTH_STATUS${NC}"
    echo -e "${YELLOW}Please check the deployment manually${NC}"
fi

# Step 8: Cache warming (optional)
if [ "$ENV" == "production" ]; then
    echo -e "${YELLOW}Step 8: Warming cache...${NC}"
    node scripts/warm-cache.js
    echo -e "${GREEN}✓ Cache warmed${NC}"
fi

# Step 9: Notify deployment complete
echo ""
echo -e "${GREEN}🎉 Deployment to $ENV completed successfully!${NC}"
echo ""
echo "Deployment Summary:"
echo "- Environment: $ENV"
echo "- Time: $(date)"
echo "- Version: $(git rev-parse --short HEAD)"
echo ""

if [ "$ENV" == "production" ]; then
    echo "Production URLs:"
    echo "- API: https://api.xbrl-data.com"
    echo "- Docs: https://api.xbrl-data.com/docs"
    echo "- Health: https://api.xbrl-data.com/api/health"
else
    echo "Staging URLs:"
    echo "- API: https://staging.xbrl-data.com"
    echo "- Docs: https://staging.xbrl-data.com/docs"
    echo "- Health: https://staging.xbrl-data.com/api/health"
fi

echo ""
echo -e "${YELLOW}Don't forget to:${NC}"
echo "1. Monitor error rates in Sentry"
echo "2. Check performance metrics"
echo "3. Verify API endpoints are working"
echo "4. Update status page if needed"