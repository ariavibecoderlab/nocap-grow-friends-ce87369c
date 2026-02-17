
-- Add columns to store custom OTP for PIN reset (decoupled from Supabase auth)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reset_otp_hash TEXT,
ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP WITH TIME ZONE;
