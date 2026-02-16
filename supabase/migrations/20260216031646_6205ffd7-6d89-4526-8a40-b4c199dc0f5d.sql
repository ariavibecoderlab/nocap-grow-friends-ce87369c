
-- Add per-merchant minimum withdrawal amount (nullable = use global default)
ALTER TABLE public.merchant_applications 
ADD COLUMN min_withdrawal_amount numeric DEFAULT NULL;

-- Seed the global default minimum withdrawal amount setting
INSERT INTO public.system_settings (key, value, description)
VALUES ('min_withdrawal_amount', '50', 'Default minimum withdrawal amount (RM) for all merchants')
ON CONFLICT DO NOTHING;
