#!/bin/bash

# XBRL BFF Deployment Script
# Automates the deployment process to Supabase Edge Functions

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="${SUPABASE_PROJECT_REF:-wpwqxhyiglbtlaimrjrx}"
FUNCTION_NAME="xbrl-bff"

echo "========================================="
echo -e "${BLUE}XBRL BFF Deployment Script${NC}"
echo "========================================="
echo

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Please install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if logged in
echo -e "${YELLOW}Checking Supabase authentication...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Supabase${NC}"
    echo "Please run: supabase login"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}"
echo

# Prompt for environment variables if not set
if [ -z "$SUPABASE_URL" ]; then
    echo -n "Enter SUPABASE_URL: "
    read SUPABASE_URL
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -n "Enter SUPABASE_SERVICE_KEY: "
    read -s SUPABASE_SERVICE_KEY
    echo
fi

if [ -z "$BFF_API_KEY" ]; then
    echo -n "Enter BFF_API_KEY (for client authentication): "
    read -s BFF_API_KEY
    echo
fi

if [ -z "$RATE_LIMIT_RPS" ]; then
    echo -n "Enter RATE_LIMIT_RPS (default: 5): "
    read RATE_LIMIT_RPS
    RATE_LIMIT_RPS="${RATE_LIMIT_RPS:-5}"
fi

if [ -z "$RATE_LIMIT_BURST" ]; then
    echo -n "Enter RATE_LIMIT_BURST (default: 10): "
    read RATE_LIMIT_BURST
    RATE_LIMIT_BURST="${RATE_LIMIT_BURST:-10}"
fi

echo
echo "Configuration:"
echo "  SUPABASE_URL: $SUPABASE_URL"
echo "  SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:20}..."
echo "  BFF_API_KEY: ${BFF_API_KEY:0:10}..."
echo "  RATE_LIMIT_RPS: $RATE_LIMIT_RPS"
echo "  RATE_LIMIT_BURST: $RATE_LIMIT_BURST"
echo

# Confirm deployment
echo -n "Deploy to project $PROJECT_REF? (y/n): "
read confirm
if [ "$confirm" != "y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo
echo -e "${YELLOW}Setting environment variables...${NC}"

# Set secrets
supabase secrets set SUPABASE_URL="$SUPABASE_URL" --project-ref "$PROJECT_REF"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to set SUPABASE_URL${NC}"
    exit 1
fi

supabase secrets set SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" --project-ref "$PROJECT_REF"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to set SUPABASE_SERVICE_KEY${NC}"
    exit 1
fi

supabase secrets set BFF_API_KEY="$BFF_API_KEY" --project-ref "$PROJECT_REF"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to set BFF_API_KEY${NC}"
    exit 1
fi

supabase secrets set RATE_LIMIT_RPS="$RATE_LIMIT_RPS" --project-ref "$PROJECT_REF"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to set RATE_LIMIT_RPS${NC}"
    exit 1
fi

supabase secrets set RATE_LIMIT_BURST="$RATE_LIMIT_BURST" --project-ref "$PROJECT_REF"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to set RATE_LIMIT_BURST${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables set${NC}"
echo

# Deploy function
echo -e "${YELLOW}Deploying function...${NC}"
supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF"

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Function deployed successfully${NC}"
echo

# Display deployment information
FUNCTION_URL="https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"

echo "========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo
echo "Function URL: $FUNCTION_URL"
echo
echo "Test the deployment:"
echo "  curl -H \"x-api-key: \$BFF_API_KEY\" \\"
echo "    \"$FUNCTION_URL/search-company?q=トヨタ\""
echo
echo "Update MCP server configuration:"
echo "  {"
echo "    \"mcpServers\": {"
echo "      \"xbrl-api\": {"
echo "        \"command\": \"npx\","
echo "        \"args\": [\"xbrl-mcp-server@latest\"],"
echo "        \"env\": {"
echo "          \"XBRL_API_URL\": \"$FUNCTION_URL\","
echo "          \"XBRL_API_KEY\": \"$BFF_API_KEY\""
echo "        }"
echo "      }"
echo "    }"
echo "  }"
echo
echo "View logs:"
echo "  supabase functions logs $FUNCTION_NAME --project-ref $PROJECT_REF"
echo