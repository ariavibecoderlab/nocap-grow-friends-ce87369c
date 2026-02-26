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

| Task | Priority | Status |
|------|----------|--------|
| Clean up test API apps created during testing | Low | ✅ Done |
| End-to-end test with real merchant credentials | Medium | ✅ Done (5/5 tests passed) |
| Add webhook signature docs to integration guide | Low | ✅ Done |
| Consider rate-limit tuning for `api-branches` | Low | ✅ No change needed (60/min appropriate) |
