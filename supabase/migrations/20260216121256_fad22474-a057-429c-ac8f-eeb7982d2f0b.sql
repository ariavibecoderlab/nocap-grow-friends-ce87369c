-- Add PIN lockout tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pin_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until timestamp with time zone;
