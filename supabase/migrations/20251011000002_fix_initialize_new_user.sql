-- Fix initialize_new_user function to create user_subscriptions with selected plan

CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_plan_id UUID;
  v_plan_name TEXT;
BEGIN
  -- Get plan name from user metadata, default to 'freemium'
  v_plan_name := COALESCE(NEW.raw_user_meta_data->>'plan', 'freemium');

  -- Get plan ID from plan name
  SELECT id INTO v_plan_id
  FROM public.subscription_plans
  WHERE name = v_plan_name
  LIMIT 1;

  -- If plan not found, use freemium as fallback
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE name = 'freemium'
    LIMIT 1;
  END IF;

  -- Create profile in private.profiles
  INSERT INTO private.profiles (
    id,
    email,
    username,
    full_name,
    plan,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'free',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Create user_subscriptions with selected plan if plan exists
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO private.user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_cycle,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_plan_id,
      -- Standard plan starts as 'pending' until payment, freemium is 'active'
      CASE WHEN v_plan_name = 'freemium' THEN 'active' ELSE 'pending' END,
      COALESCE(NEW.raw_user_meta_data->>'billing_period', 'monthly'),
      NOW(),
      -- Freemium never expires, paid plans expire in 30 days (until payment)
      CASE WHEN v_plan_name = 'freemium' THEN NOW() + INTERVAL '100 years' ELSE NOW() + INTERVAL '30 days' END,
      false,
      NOW(),
      NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
