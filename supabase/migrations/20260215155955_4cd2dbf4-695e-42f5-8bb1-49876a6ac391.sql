
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('member', 'merchant', 'admin');

-- Create transaction_type enum
CREATE TYPE public.transaction_type AS ENUM (
  'top_up', 'payment', 'transfer_in', 'transfer_out', 
  'cashback', 'commission', 'withdrawal', 'refund'
);

-- Create transaction_status enum
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  address TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  has_pin BOOLEAN NOT NULL DEFAULT false,
  pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate as required)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(12,2) DEFAULT 0.00,
  commission_amount DECIMAL(12,2) DEFAULT 0.00,
  net_amount DECIMAL(12,2),
  reference_id UUID,
  description TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral tree (for 5-tier tracking)
CREATE TABLE public.referral_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ancestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ancestor_id)
);

-- System settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default platform fee
INSERT INTO public.system_settings (key, value, description) 
VALUES ('platform_fee_percentage', '3', 'Platform fee percentage deducted from every successful payment');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Auto-create profile, wallet, and member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_profile_id UUID;
  new_profile_id UUID;
  referrer_user_id UUID;
  ancestor RECORD;
  current_tier INT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    generate_referral_code(),
    (SELECT id FROM public.profiles WHERE referral_code = (NEW.raw_user_meta_data->>'referral_code') LIMIT 1)
  )
  RETURNING id INTO new_profile_id;

  -- Create wallet
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);

  -- Assign member role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');

  -- Build referral tree
  SELECT id, user_id INTO referrer_profile_id, referrer_user_id 
  FROM public.profiles 
  WHERE referral_code = (NEW.raw_user_meta_data->>'referral_code') LIMIT 1;

  IF referrer_user_id IS NOT NULL THEN
    -- Tier 1: direct referrer
    INSERT INTO public.referral_tree (user_id, ancestor_id, tier)
    VALUES (NEW.id, referrer_user_id, 1);

    -- Tiers 2-5: ancestors of the referrer
    current_tier := 2;
    FOR ancestor IN 
      SELECT rt.ancestor_id FROM public.referral_tree rt 
      WHERE rt.user_id = referrer_user_id 
      ORDER BY rt.tier ASC LIMIT 4
    LOOP
      INSERT INTO public.referral_tree (user_id, ancestor_id, tier)
      VALUES (NEW.id, ancestor.ancestor_id, current_tier);
      current_tier := current_tier + 1;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles: users can read their own, admins can manage
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Wallets: users can view their own
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Transactions: users can view their own
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Referral tree: users can view their own
CREATE POLICY "Users can view own referrals" ON public.referral_tree FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = ancestor_id);
CREATE POLICY "Admins can view all referrals" ON public.referral_tree FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- System settings: everyone can read, admins can update
CREATE POLICY "Anyone can read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON public.system_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles: allow lookup by referral code for registration
CREATE POLICY "Anyone can lookup by referral code" ON public.profiles FOR SELECT USING (true);
