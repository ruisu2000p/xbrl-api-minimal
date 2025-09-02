#!/bin/bash

# XBRL BFF Test Script
# Tests all three endpoints with various scenarios

# Configuration
BFF_URL="${BFF_URL:-https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-bff}"
BFF_API_KEY="${BFF_API_KEY:-test-api-key}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for testing
test_endpoint() {
    local test_name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Testing: $test_name ... "
    
    response=$(curl -s -w "\n%{http_code}" -H "x-api-key: $BFF_API_KEY" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} (Status: $http_code)"
        ((TESTS_PASSED++))
        if [ -n "$body" ]; then
            echo "  Response: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body" | head -c 100)"
        fi
    else
        echo -e "${RED}✗${NC} (Expected: $expected_status, Got: $http_code)"
        ((TESTS_FAILED++))
        if [ -n "$body" ]; then
            echo "  Error: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body")"
        fi
    fi
    echo
}

# Test without API key
test_no_auth() {
    local test_name="$1"
    local url="$2"
    
    echo -n "Testing: $test_name ... "
    
    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "401" ]; then
        echo -e "${GREEN}✓${NC} (Correctly rejected: $http_code)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} (Expected: 401, Got: $http_code)"
        ((TESTS_FAILED++))
    fi
    echo
}

echo "========================================="
echo "XBRL BFF API Test Suite"
echo "========================================="
echo "API URL: $BFF_URL"
echo "API Key: ${BFF_API_KEY:0:8}..."
echo "========================================="
echo

# Test 1: Search Company Endpoint
echo -e "${YELLOW}1. Testing /search-company endpoint${NC}"
echo "-----------------------------------------"

test_endpoint \
    "Search for トヨタ" \
    "$BFF_URL/search-company?q=トヨタ" \
    "200"

test_endpoint \
    "Search for 亀田製菓" \
    "$BFF_URL/search-company?q=亀田製菓" \
    "200"

test_endpoint \
    "Search with limit=5" \
    "$BFF_URL/search-company?q=ソニー&limit=5" \
    "200"

test_endpoint \
    "Search without query (should fail)" \
    "$BFF_URL/search-company" \
    "400"

test_no_auth \
    "Search without API key (should fail)" \
    "$BFF_URL/search-company?q=test"

# Test 2: List Markdown Files Endpoint
echo -e "${YELLOW}2. Testing /list-md endpoint${NC}"
echo "-----------------------------------------"

test_endpoint \
    "List files for S100OC13" \
    "$BFF_URL/list-md?company_id=S100OC13" \
    "200"

test_endpoint \
    "List files for S100OC13 fiscal year 2023" \
    "$BFF_URL/list-md?company_id=S100OC13&fiscal_year=2023" \
    "200"

test_endpoint \
    "List without company_id (should fail)" \
    "$BFF_URL/list-md" \
    "400"

# Test 3: Get Markdown Content Endpoint
echo -e "${YELLOW}3. Testing /get-md endpoint${NC}"
echo "-----------------------------------------"

test_endpoint \
    "Get markdown file content" \
    "$BFF_URL/get-md?path=S100OC13/PublicDoc_markdown/0101010_honbun.md" \
    "200"

test_endpoint \
    "Get non-.md file (should fail)" \
    "$BFF_URL/get-md?path=S100OC13/test.txt" \
    "400"

test_endpoint \
    "Get without path (should fail)" \
    "$BFF_URL/get-md" \
    "400"

test_endpoint \
    "Get non-existent file (should fail)" \
    "$BFF_URL/get-md?path=INVALID/non-existent.md" \
    "404"

# Test 4: Rate Limiting
echo -e "${YELLOW}4. Testing Rate Limiting${NC}"
echo "-----------------------------------------"

echo "Sending 15 rapid requests to test rate limiting..."
for i in {1..15}; do
    response=$(curl -s -w "%{http_code}" -H "x-api-key: $BFF_API_KEY" "$BFF_URL/search-company?q=test$i" -o /dev/null)
    if [ "$response" = "429" ]; then
        echo -e "Request $i: ${YELLOW}Rate limited (429)${NC}"
        ((TESTS_PASSED++))
        break
    elif [ "$response" = "200" ]; then
        echo -e "Request $i: ${GREEN}Success (200)${NC}"
    else
        echo -e "Request $i: ${RED}Error ($response)${NC}"
    fi
done
echo

# Test 5: Invalid Endpoint
echo -e "${YELLOW}5. Testing Invalid Endpoints${NC}"
echo "-----------------------------------------"

test_endpoint \
    "Invalid endpoint" \
    "$BFF_URL/invalid-endpoint" \
    "404"

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi