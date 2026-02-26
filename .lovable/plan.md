## Plan: Merchant-Level API + Complete 3rd Party Integration Guide

### Status Summary

| Area | Status |
|------|--------|
| Database migration (`branch_id` nullable) | ✅ Done |
| `api-register-app` (optional `branch_id`) | ✅ Done |
| `api-charge` (accept `branch_id` in body) | ✅ Done |
| `api-refund` (resolve branch from metadata) | ✅ Done |
| `api-branches` endpoint (new) | ✅ Done |
| `MerchantApiApps.tsx` (merchant-level option) | ✅ Done |
| `ApiAppsManagement.tsx` (admin badges) | ✅ Done |
| `ApiDocs.tsx` (api-branches docs + try-it) | ✅ Done |
| `supabase/config.toml` (register function) | ✅ Done |
| Integration guide markdown (9 prompts) | ✅ Done |
| PDF generator (9 prompts) | ✅ Done |
| Endpoint testing (401 auth, deployment) | ✅ Done |

### Remaining Tasks

| Task | Priority | Notes |
|------|----------|-------|
| Clean up test API apps created during testing | Low | Two test apps in `api_applications` table |
| End-to-end test with real merchant credentials | Medium | Verify full charge→refund flow with merchant-level app |
| Add webhook signature docs to integration guide | Low | HMAC-SHA256 verification example |
| Consider rate-limit tuning for `api-branches` | Low | Currently 60/min, may need adjustment |
