-- Ensure platform_fee_percent exists in system_settings with correct value (1.5%)
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

INSERT INTO system_settings (key, value, description)
VALUES (
  'platform_fee_percent',
  '1.5',
  'Platform fee charged on every transaction, as a percentage of total amount.'
)
ON CONFLICT (key) DO NOTHING;

-- Also ensure min_pin_amount default exists
INSERT INTO system_settings (key, value, description)
VALUES (
  'min_pin_amount',
  '50',
  'Minimum order/payment amount (RM) that requires PIN verification.'
)
ON CONFLICT (key) DO NOTHING;
