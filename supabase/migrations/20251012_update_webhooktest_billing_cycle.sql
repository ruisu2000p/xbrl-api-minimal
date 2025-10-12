-- Update webhooktest2024@example.com billing cycle to yearly
UPDATE public.user_subscriptions
SET
  billing_cycle = 'yearly',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'webhooktest2024@example.com'
);
