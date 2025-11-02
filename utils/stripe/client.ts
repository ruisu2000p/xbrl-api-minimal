import Stripe from 'stripe';

/**
 * Stripe client factory
 *
 * Creates a Stripe client instance with proper key handling:
 * - Trims whitespace and newlines from the API key
 * - Uses account's default API version (no explicit version specified)
 * - Throws error if key is not configured
 *
 * @throws {Error} If STRIPE_SECRET_KEY is not set
 * @returns {Stripe} Configured Stripe client instance
 */
export function createStripeClient(): Stripe {
  const raw = process.env.STRIPE_SECRET_KEY ?? '';

  // Remove any "Bearer " prefix (if accidentally included), newlines, and trim
  const cleanKey = raw
    .replace(/^Bearer\s+/i, '')
    .replace(/[\r\n]+/g, '')
    .trim();

  if (!cleanKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  // Use account's default API version by not specifying apiVersion
  // This is safer and prevents version mismatch errors
  return new Stripe(cleanKey);
}
