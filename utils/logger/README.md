# Structured Logging System

Production-ready structured logging with Vercel Logs integration, PII masking, and request correlation.

## Features

✅ **Vercel Logs Integration** - Structured JSON format for searchable logs
✅ **Request Correlation** - Automatic `x-vercel-id` extraction
✅ **PII Masking** - Always-on email, token, and credential redaction
✅ **Debug Allowlisting** - Per-user debug logs in production
✅ **Type-Safe** - Full TypeScript support
✅ **Zero Dependencies** - No external logger libraries needed

## Quick Start

### Server-side (API Routes, Webhooks)

```typescript
import { logger, extractRequestId } from '@/utils/logger';

export async function POST(req: NextRequest) {
  // Extract request ID at route entry
  await extractRequestId();

  logger.info('Request received', {
    userId: user.id,
    stripe: {
      customerId: 'cus_123',
      action: 'checkout',
      outcome: 'success',
    },
  });
}
```

### Client-side (React Components)

```typescript
import { logger } from '@/utils/logger/client';

function MyComponent() {
  const handleClick = () => {
    logger.info('Button clicked', { buttonId: 'submit' });
  };
}
```

## Log Levels

- `logger.info()` - General information (always logged)
- `logger.warn()` - Warnings (always logged)
- `logger.error()` - Errors (always logged)
- `logger.debug()` - Debug info (production: only when allowlisted)

## Log Schema

```typescript
{
  lvl: 'info' | 'warn' | 'error' | 'debug',
  msg: string,
  ts: string,                    // ISO 8601 timestamp
  requestId?: string,            // From x-vercel-id
  path?: string,                 // API route path
  userId?: string,               // User ID
  email?: string,                // Auto-masked
  stripe?: {
    eventId?: string,
    customerId?: string,
    subscriptionId?: string,
    action?: 'checkout' | 'upgrade' | 'downgrade' | 'cancel' | 'delete' | 'webhook',
    outcome?: 'success' | 'skip' | 'error',
  },
  err?: {
    type?: string,
    code?: string,
    message?: string,
    stack?: string,              // Dev only
  },
  meta?: Record<string, unknown>,  // Auto-redacted
}
```

## PII Masking

### Automatic Masking

```typescript
logger.info('User signed up', {
  email: 'user@example.com',  // → 'us***@example.com'
  meta: {
    token: 'sk_live_123',     // → '[REDACTED]'
    password: 'secret',       // → '[REDACTED]'
  },
});
```

### Manual Masking

```typescript
import { maskEmail, redactSensitiveData } from '@/utils/logger';

const masked = maskEmail('user@example.com');  // 'us***@example.com'
const safe = redactSensitiveData(userData);    // Auto-redacted object
```

## Debug Mode

### Production - Per-User Allowlist

Add to `.env.production`:

```bash
DEBUG_USERS=user-id-123,user@example.com
```

### Client - Browser Toggle

```javascript
// URL parameter
https://app.com?debug=1

// localStorage
localStorage.setItem('DEBUG', '1');

// Cookie
document.cookie = 'DEBUG=1';
```

## Vercel Logs Queries

```bash
# Find all errors
lvl:error

# Trace a specific request
requestId:req_abc123

# Find webhook failures
lvl:error stripe.action:webhook

# Find checkout successes
stripe.action:checkout stripe.outcome:success

# Find errors for a specific user
userId:abc-123 lvl:error

# Find Stripe events
stripe.eventId:evt_1234
```

## Migration Guide

See [logging-migration-guide.md](../../docs/logging-migration-guide.md) for step-by-step migration instructions.

## Architecture

```
utils/logger/
├── types.ts          # TypeScript type definitions
├── pii.ts            # PII masking utilities
├── server.ts         # Server-side structured logger
├── client.ts         # Client-side safe logger
├── request.ts        # Request ID extraction
└── index.ts          # Public exports
```

## Environment Variables

```bash
# Production
NODE_ENV=production
DEBUG_USERS=user-id-1,user@example.com  # Optional: Debug allowlist

# Development
NODE_ENV=development  # All logs including debug
```

## Performance

- **Zero overhead** - No external dependencies
- **Lazy evaluation** - PII masking only on actual log output
- **Async-safe** - Works with Next.js App Router
- **Edge compatible** - Works in Edge Runtime (client logger)

## Security

- ✅ PII masking **always enforced**
- ✅ Tokens/passwords **automatically redacted**
- ✅ Debug logs **disabled by default** in production
- ✅ Stack traces **stripped** in production
- ✅ Email masking **cannot be disabled**

## Examples

See:
- [webhook-logging-example.md](../../docs/webhook-logging-example.md) - Webhook handler migration
- [logging-migration-guide.md](../../docs/logging-migration-guide.md) - General migration guide
