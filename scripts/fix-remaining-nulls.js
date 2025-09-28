#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix lib/infrastructure/health-check.ts
const healthCheckPath = path.join(process.cwd(), 'lib/infrastructure/health-check.ts');
if (fs.existsSync(healthCheckPath)) {
  let content = fs.readFileSync(healthCheckPath, 'utf8');

  // Fix line 84 and 122
  content = content.replace(
    /const client = supabaseManager\.createTemporaryAdminClient\(\)(\r?\n\s+)/g,
    `const client = supabaseManager.createTemporaryAdminClient()$1    if (!client) {$1      throw new Error('Admin client not available');$1    }$1`
  );

  fs.writeFileSync(healthCheckPath, content);
  console.log('✅ Fixed: lib/infrastructure/health-check.ts');
}

// Fix lib/infrastructure/rate-limiter.ts
const rateLimiterPath = path.join(process.cwd(), 'lib/infrastructure/rate-limiter.ts');
if (fs.existsSync(rateLimiterPath)) {
  let content = fs.readFileSync(rateLimiterPath, 'utf8');

  // Add null checks for supabase
  content = content.replace(
    /const supabase = supabaseManager\.getServiceClient\(\)(\r?\n)(?!.*if \(!supabase\))/g,
    `const supabase = supabaseManager.getServiceClient()$1    if (!supabase) {$1      console.error('Service client not available for rate limiting');$1      return { allowed: true, limit: 100, remaining: 100, resetTime: new Date() };$1    }$1`
  );

  fs.writeFileSync(rateLimiterPath, content);
  console.log('✅ Fixed: lib/infrastructure/rate-limiter.ts');
}

// Fix lib/security/csrf.ts
const csrfPath = path.join(process.cwd(), 'lib/security/csrf.ts');
if (fs.existsSync(csrfPath)) {
  let content = fs.readFileSync(csrfPath, 'utf8');

  // Add null checks for supabase
  content = content.replace(
    /const supabase = supabaseManager\.getServiceClient\(\)(\r?\n)(?!.*if \(!supabase\))/g,
    `const supabase = supabaseManager.getServiceClient()$1    if (!supabase) {$1      throw new Error('Service client not available for CSRF protection');$1    }$1`
  );

  fs.writeFileSync(csrfPath, content);
  console.log('✅ Fixed: lib/security/csrf.ts');
}

// Fix lib/security/auth-manager.ts - more complex
const authManagerPath = path.join(process.cwd(), 'lib/security/auth-manager.ts');
if (fs.existsSync(authManagerPath)) {
  let content = fs.readFileSync(authManagerPath, 'utf8');

  // Fix constructor
  content = content.replace(
    /this\.supabase = client;/g,
    `if (!client) {
      throw new Error('Service client not available');
    }
    this.supabase = client;`
  );

  fs.writeFileSync(authManagerPath, content);
  console.log('✅ Fixed: lib/security/auth-manager.ts');
}

console.log('\n✨ Remaining null checks fixed!');