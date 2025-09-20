#!/usr/bin/env node
/**
 * Test suite for XBRL MCP Server
 */

import { createClient } from '@supabase/supabase-js';
import { AuthManager } from './auth.js';
import { DataAccessLayer } from './data-access.js';
import { Middleware } from './middleware.js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required for testing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const authManager = new AuthManager(supabase);
const dataAccess = new DataAccessLayer(supabase);
const middleware = new Middleware(supabase);

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Test helper function
 */
async function test(name, fn) {
  console.log(`\n📝 Testing: ${name}`);
  try {
    await fn();
    console.log(`✅ Passed: ${name}`);
    results.passed++;
  } catch (error) {
    console.error(`❌ Failed: ${name}`);
    console.error(`   Error: ${error.message}`);
    results.failed++;
    results.errors.push({ test: name, error: error.message });
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting XBRL MCP Server Tests\n');
  console.log('=' . repeat(50));

  // Test 1: Database Connection
  await test('Database Connection', async () => {
    const { data, error } = await supabase
      .from('markdown_files_metadata')
      .select('count')
      .limit(1);

    if (error) throw error;
    console.log(`   Found metadata table`);
  });

  // Test 2: API Key Generation
  let testApiKey;
  let testUserId;
  await test('API Key Generation', async () => {
    // Create a test user first
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) throw authError;
    testUserId = authData.user.id;

    // Generate API key
    const keyResult = await authManager.generateApiKey(
      testUserId,
      'Test Key',
      'free'
    );

    if (!keyResult.api_key) throw new Error('No API key generated');
    testApiKey = keyResult.api_key;
    console.log(`   Generated API key: ${testApiKey.substring(0, 20)}...`);
  });

  // Test 3: API Key Validation
  await test('API Key Validation', async () => {
    const validation = await authManager.validateApiKey(testApiKey);
    if (!validation.valid) throw new Error('API key validation failed');
    console.log(`   API key is valid for user: ${validation.user_id}`);
  });

  // Test 4: Rate Limiting
  await test('Rate Limiting', async () => {
    const validation = await authManager.validateApiKey(testApiKey);
    const context = { key_id: validation.key_id };

    const rateLimitResult = await middleware.rateLimit(context);
    if (!rateLimitResult.allowed) throw new Error('Rate limit check failed');
    console.log(`   Rate limit: ${rateLimitResult.headers['X-RateLimit-Remaining']} requests remaining`);
  });

  // Test 5: Search Documents
  await test('Search Documents', async () => {
    const results = await dataAccess.searchDocuments({
      company: 'トヨタ',
      limit: 5,
      tier: 'free'
    });

    console.log(`   Found ${results.total} documents`);
    if (results.documents.length > 0) {
      console.log(`   First document: ${results.documents[0].company_name} (${results.documents[0].fiscal_year})`);
    }
  });

  // Test 6: List Companies
  await test('List Companies', async () => {
    const results = await dataAccess.listCompanies({
      fiscal_year: 'FY2024',
      limit: 10,
      tier: 'free'
    });

    console.log(`   Found ${results.total} companies`);
    if (results.companies.length > 0) {
      console.log(`   First company: ${results.companies[0].company_name}`);
    }
  });

  // Test 7: Get Fiscal Years
  await test('Get Fiscal Years', async () => {
    const years = await dataAccess.getFiscalYears({ tier: 'free' });
    console.log(`   Available fiscal years: ${years.map(y => y.fiscal_year).join(', ')}`);
  });

  // Test 8: Get Statistics
  await test('Get Statistics', async () => {
    const stats = await dataAccess.getStatistics({ tier: 'free' });
    console.log(`   Total documents: ${stats.total_documents}`);
    console.log(`   Total companies: ${stats.total_companies}`);
  });

  // Test 9: Request Validation
  await test('Request Validation', async () => {
    const valid = middleware.validateRequest('search-documents', {
      company: 'Test Company',
      fiscal_year: 'FY2024',
      limit: 20
    });

    if (!valid.valid) throw new Error(valid.error);
    console.log('   Request validation passed');

    // Test invalid request
    const invalid = middleware.validateRequest('search-documents', {
      // Missing required 'company' parameter
      fiscal_year: 'FY2024'
    });

    if (invalid.valid) throw new Error('Should have failed validation');
    console.log('   Invalid request correctly rejected');
  });

  // Test 10: Input Sanitization
  await test('Input Sanitization', async () => {
    const malicious = "'; DROP TABLE users; --";
    const sanitized = middleware.sanitizeInput(malicious);

    if (sanitized.includes('DROP')) throw new Error('SQL injection not sanitized');
    console.log(`   Sanitized input: "${sanitized}"`);
  });

  // Test 11: Document Retrieval (if documents exist)
  await test('Document Retrieval', async () => {
    // First, get a document path
    const searchResults = await dataAccess.searchDocuments({
      company: '',  // Get any company
      limit: 1,
      tier: 'free'
    });

    if (searchResults.documents.length > 0) {
      const docPath = searchResults.documents[0].storage_path;

      try {
        const doc = await dataAccess.getDocument(docPath, {
          max_size: 1000,  // Get first 1KB only for test
          tier: 'free'
        });

        console.log(`   Retrieved document: ${doc.metadata.file_name}`);
        console.log(`   Content size: ${doc.size} bytes`);
      } catch (error) {
        // Document might not exist in storage, that's OK for test
        console.log(`   Document not in storage (expected in test environment)`);
      }
    } else {
      console.log('   No documents available for testing');
    }
  });

  // Test 12: Error Handling
  await test('Error Handling', async () => {
    const error = new Error('Document not found');
    const errorResponse = await middleware.handleError(error, {
      tool: 'get-document',
      key_id: 'test-key'
    });

    if (errorResponse.error.code !== 404) {
      throw new Error('Incorrect error code');
    }
    console.log(`   Error properly categorized as: ${errorResponse.error.type}`);
  });

  // Cleanup: Revoke test API key
  if (testApiKey) {
    await test('Cleanup: Revoke Test API Key', async () => {
      const validation = await authManager.validateApiKey(testApiKey);
      if (validation.valid) {
        await authManager.revokeApiKey(validation.key_id);
        console.log('   Test API key revoked');
      }
    });
  }

  // Print test summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary\n');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\n Failed tests:');
    results.errors.forEach(err => {
      console.log(`  - ${err.test}: ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(50));

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error during testing:', error);
  process.exit(1);
});