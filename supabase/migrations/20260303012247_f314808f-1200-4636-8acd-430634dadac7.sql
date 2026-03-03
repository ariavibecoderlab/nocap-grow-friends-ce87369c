
ALTER TABLE public.merchant_branches
ADD COLUMN report_frequency text[] NOT NULL DEFAULT '{daily,weekly,monthly}';

COMMENT ON COLUMN public.merchant_branches.report_frequency IS 'Array of enabled email report types: daily, weekly, monthly';
