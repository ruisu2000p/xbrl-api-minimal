-- Add comprehensive RLS policies for all tables

-- Enable RLS on all public tables that need it
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Companies table policies
CREATE POLICY "Public companies are viewable by everyone"
  ON public.companies
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- API Keys policies
CREATE POLICY "Users can manage own API keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- API Logs policies
CREATE POLICY "Users can view own API logs"
  ON public.api_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.api_keys
      WHERE api_keys.id = api_logs.api_key_id
      AND api_keys.user_id = auth.uid()
    )
  );

-- Financial Reports policies (public data)
CREATE POLICY "Financial reports are publicly viewable"
  ON public.financial_reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Financial Metrics policies (public data)
CREATE POLICY "Financial metrics are publicly viewable"
  ON public.financial_metrics
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Subscription Plans policies
CREATE POLICY "Subscription plans are viewable by everyone"
  ON public.subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Only admins can manage subscription plans"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- User Subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own subscriptions"
  ON public.user_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usage Logs policies
CREATE POLICY "Users can view own usage logs"
  ON public.usage_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert usage logs"
  ON public.usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_api_key_id ON public.api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_subscriptions.user_id = $1
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated;

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION public.get_user_plan(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  plan_name TEXT;
BEGIN
  SELECT sp.name INTO plan_name
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = $1
  AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  RETURN COALESCE(plan_name, 'Free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_plan(UUID) TO authenticated;