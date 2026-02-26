

## Plan: Affiliate Module API Integration for 3rd Party Systems

### What This Is About

The 3rd party system (already integrated with NoCap wallet for payments) now wants to integrate with the **affiliate/referral module**. This means:

1. Their customers can **refer** other customers using NoCap referral codes
2. **New customers** who sign up on the 3rd party system should automatically get a NoCap account (linked via referral)
3. **Existing NoCap members** can connect their accounts
4. 3rd party can query **referral stats**, **cashback**, and **wallet balance** for their connected users

### Current State

- Existing API scopes: `balance`, `charge`
- OAuth flow exists: `/authorize` page, token exchange, access tokens
- Referral system exists: `referral_tree` table, `profiles.referral_code`, `handle_new_user` trigger builds the tree
- Existing connected users have access tokens with `balance` and `charge` scopes

### New API Endpoints Needed

#### 1. `api-referral-info` -- Get Referral Info
Returns the connected user's referral code, referral stats, and commission/cashback earnings.

**Response:**
```json
{
  "referral_code": "A1B2C3D4",
  "referral_link": "https://nocap.life/auth?ref=A1B2C3D4",
  "stats": {
    "direct_referrals": 5,
    "network_size": 12,
    "total_cashback": 15.50,
    "total_commission": 32.00
  }
}
```

**Scope required:** `referral` (new scope)

#### 2. `api-referral-register` -- Register New User via Referral
Allows the 3rd party to register a new NoCap account for their customer, automatically linked by referral code.

**Request:**
```json
{
  "email": "newuser@example.com",
  "referral_code": "A1B2C3D4",
  "full_name": "Ahmad Bin Ali"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "referral_code": "NEW_CODE",
  "access_token": "...",
  "message": "User registered and connected"
}
```

This endpoint will:
- Create the user in auth (auto-confirm since it's API-initiated)
- The existing `handle_new_user` trigger builds the referral tree automatically
- Create a wallet
- Issue an access token for the 3rd party app
- Return the new user's own referral code so they can refer others too

**Auth:** API key + secret only (no bearer token needed since user doesn't exist yet)

#### 3. `api-referral-network` -- Get Referral Network
Returns the user's referral tree (Tiers 1-5) with basic info.

**Response:**
```json
{
  "tiers": [
    { "tier": 1, "count": 3, "members": [{"name": "Ahmad", "joined": "2026-02-23"}] },
    { "tier": 2, "count": 5, "members": [...] }
  ]
}
```

**Scope required:** `referral`

#### 4. `api-cashback-history` -- Get Cashback/Commission History
Returns the user's cashback and commission transaction history.

**Response:**
```json
{
  "transactions": [
    { "type": "cashback", "amount": 1.50, "description": "...", "created_at": "..." },
    { "type": "commission", "amount": 0.80, "description": "...", "created_at": "..." }
  ],
  "totals": { "cashback": 15.50, "commission": 32.00 }
}
```

**Scope required:** `referral`

### What Existing Connected Users Need To Do

Existing users who are already connected to the 3rd party system have tokens with `balance` and `charge` scopes only. They need to:

1. **Re-authorize** with the updated scope list (`balance`, `charge`, `referral`) -- the 3rd party system redirects them to `/authorize?scopes=balance,charge,referral`
2. This will issue a new token with the `referral` scope included
3. No data migration needed -- their referral tree already exists in NoCap

### Changes Summary

| Area | Change |
|------|--------|
| New scope | Add `referral` to the allowed scopes list |
| New edge function | `api-referral-info` -- get referral code + stats |
| New edge function | `api-referral-register` -- register new user via API with referral |
| New edge function | `api-referral-network` -- get referral tree |
| New edge function | `api-cashback-history` -- get cashback/commission history |
| Update `api-authorize` | Accept `referral` as valid scope |
| Update `Authorize.tsx` | Show "View Referral Network" permission in consent screen |
| Update `api-balance` | No change needed (already works) |
| Config | Add JWT verification settings for new functions in `config.toml` |
| Docs | Update API documentation edge function with new endpoints |

### Technical Details

- All new endpoints follow existing patterns: API key + secret + bearer token auth, rate limiting, request logging
- `api-referral-register` uses service role to create auth user (similar to how `handle_new_user` trigger works) and auto-confirms email since it's API-initiated
- The referral code validation reuses existing `profiles.referral_code` lookup
- No database schema changes needed -- all data already exists in `profiles`, `referral_tree`, `transactions`, and `wallets` tables
- Webhook event `user.registered` will be sent when a new user is registered via API

