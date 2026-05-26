-- Phase 5: Promoted listings + platform vouchers

-- ── promoted_listings ─────────────────────────────────────────────────────────
create table if not exists promoted_listings (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references marketplace_stores(id) on delete cascade,
  product_id      uuid not null references marketplace_products(id) on delete cascade,
  status          text not null default 'active' check (status in ('active', 'paused', 'ended')),
  daily_budget    numeric(10,2) not null default 5.00,
  bid_per_click   numeric(10,2) not null default 0.10,
  impressions     integer not null default 0,
  clicks          integer not null default 0,
  spend_today     numeric(10,2) not null default 0,
  start_date      timestamptz not null default now(),
  end_date        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table promoted_listings enable row level security;

-- Merchants can manage their own promoted listings
create policy "merchant_manage_own_promoted_listings"
  on promoted_listings for all
  using (
    store_id in (
      select id from marketplace_stores where merchant_user_id = auth.uid()
    )
  );

-- ── platform_vouchers ─────────────────────────────────────────────────────────
create table if not exists platform_vouchers (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  description     text,
  discount_type   text not null check (discount_type in ('percentage', 'fixed')),
  discount_value  numeric(10,2) not null,
  min_order_amount numeric(10,2) default 0,
  max_discount    numeric(10,2),           -- cap for percentage vouchers
  max_uses        integer,
  used_count      integer not null default 0,
  valid_from      timestamptz not null default now(),
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

alter table platform_vouchers enable row level security;

-- Admins (identified by metadata or role) can do everything;
-- buyers can SELECT active vouchers for validation only via RPC.
-- We expose management through service role (admin portal) and
-- provide a separate RPC for buyer-side validation.
create policy "admins_manage_platform_vouchers"
  on platform_vouchers for all
  using (
    (auth.jwt() ->> 'role') = 'admin'
    or exists (
      select 1 from profiles where user_id = auth.uid() and is_admin = true
    )
  );

create policy "anyone_select_active_vouchers"
  on platform_vouchers for select
  using (is_active = true);

-- ── platform_voucher_redemptions ─────────────────────────────────────────────
create table if not exists platform_voucher_redemptions (
  id          uuid primary key default gen_random_uuid(),
  voucher_id  uuid not null references platform_vouchers(id) on delete cascade,
  user_id     uuid not null references auth.users(id),
  order_id    uuid,
  redeemed_at timestamptz not null default now(),
  unique (voucher_id, user_id)   -- one redemption per user per voucher
);

alter table platform_voucher_redemptions enable row level security;

create policy "users_see_own_redemptions"
  on platform_voucher_redemptions for select
  using (user_id = auth.uid());

-- ── validate_platform_voucher RPC ────────────────────────────────────────────
create or replace function validate_platform_voucher(
  p_code        text,
  p_user_id     uuid,
  p_order_total numeric
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v              platform_vouchers%rowtype;
  discount_amt   numeric;
begin
  select * into v
  from platform_vouchers
  where code = upper(p_code) and is_active = true;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'Voucher not found');
  end if;

  -- Expiry check
  if v.expires_at is not null and v.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'Voucher has expired');
  end if;

  -- Valid from check
  if v.valid_from > now() then
    return jsonb_build_object('valid', false, 'reason', 'Voucher is not yet active');
  end if;

  -- Max uses check
  if v.max_uses is not null and v.used_count >= v.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'Voucher has reached maximum uses');
  end if;

  -- Min order check
  if v.min_order_amount is not null and p_order_total < v.min_order_amount then
    return jsonb_build_object(
      'valid', false,
      'reason', format('Minimum order of RM %.2f required', v.min_order_amount)
    );
  end if;

  -- Already redeemed by this user?
  if exists (
    select 1 from platform_voucher_redemptions
    where voucher_id = v.id and user_id = p_user_id
  ) then
    return jsonb_build_object('valid', false, 'reason', 'You have already used this voucher');
  end if;

  -- Calculate discount
  if v.discount_type = 'percentage' then
    discount_amt := p_order_total * v.discount_value / 100;
    if v.max_discount is not null then
      discount_amt := least(discount_amt, v.max_discount);
    end if;
  else
    discount_amt := v.discount_value;
  end if;

  -- Cap at order total
  discount_amt := least(discount_amt, p_order_total);

  return jsonb_build_object(
    'valid',           true,
    'voucher_id',      v.id,
    'discount_amount', discount_amt
  );
end;
$$;

grant execute on function validate_platform_voucher to authenticated;
