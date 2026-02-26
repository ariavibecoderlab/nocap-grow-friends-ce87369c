
-- Enable pg_cron and pg_net extensions for scheduled HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
