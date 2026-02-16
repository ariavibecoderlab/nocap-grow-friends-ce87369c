
-- Add unique constraint on phone (only for non-null values)
CREATE UNIQUE INDEX profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL;
