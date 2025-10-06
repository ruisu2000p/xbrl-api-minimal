-- フリーミアムプランとスタンダードプランのデータを追加
-- Migration: 20251007000000_add_subscription_plans_data

-- 既存データをクリア（冪等性確保）
DELETE FROM private.subscription_plans WHERE name IN ('freemium', 'standard');

-- フリーミアムプラン
INSERT INTO private.subscription_plans
(name, description, price_monthly, price_yearly, requests_per_hour, requests_per_day, requests_per_month, features, is_active, display_order)
VALUES
(
  'freemium',
  'フリーミアムプラン - 直近1年のデータアクセス',
  0,
  0,
  10,
  100,
  3000,
  '{
    "data_access": "直近1年分",
    "support": "コミュニティ",
    "api_calls_per_day": 100,
    "api_calls_per_month": 3000,
    "historical_data": false
  }'::jsonb,
  true,
  1
);

-- スタンダードプラン
INSERT INTO private.subscription_plans
(name, description, price_monthly, price_yearly, requests_per_hour, requests_per_day, requests_per_month, features, is_active, display_order)
VALUES
(
  'standard',
  'スタンダードプラン - 全履歴データアクセス',
  2980,
  29800,
  100,
  1000,
  30000,
  '{
    "data_access": "全履歴",
    "support": "メールサポート",
    "api_calls_per_day": 1000,
    "api_calls_per_month": 30000,
    "historical_data": true,
    "priority_support": true
  }'::jsonb,
  true,
  2
);
