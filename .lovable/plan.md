

# Sync API Guide PDF with Web Version

## Problem
The downloadable PDF (`generateApiGuidePdf.ts`) is out of sync with the live web docs (`ApiDocs.tsx`). Several endpoints, fields, and sections present on the web are missing from the PDF.

## Gaps Identified

| Missing in PDF | Present in Web |
|---|---|
| `/api-distribute` endpoint (Path D) | Full endpoint with params, example, response |
| Payment Flow Comparison (Path A vs D) | Side-by-side visual comparison |
| `phone` field in `/api-referral-register` | Added recently — body param + curl example |
| `topup` scope in OAuth scope list | Listed in authorize URL |
| `distribution.completed` webhook event | Documented in distribute endpoint |
| `user.registered` webhook event | Mentioned in referral-register |
| `/api-distribute` in rate limits table | 60 req/min |
| `/api-topup` in rate limits table | 30 req/min (present in web, inconsistent in PDF) |
| Path D integration prompts (13-15) | Distribution prompts in IntegrationRoadmap |
| Version date outdated | Says "Version 1.1 — February 2026" |

## Changes to `src/lib/generateApiGuidePdf.ts`

1. **Update version** to "1.2 — April 2026"
2. **Add `phone` field** to section 4.2 (referral-register) — add to table row and curl example
3. **Add `topup` scope** to OAuth scope parameter description (section 2)
4. **Add `/api-distribute` endpoint** as new section 3d after top-up — include body params table, curl example, response, negative balance note
5. **Add Payment Flow Comparison** summary (Path A wallet vs Path D cash/card) as a new section after distribute
6. **Add webhook events**: `distribution.completed`, `user.registered`, `topup.completed`, `topup.failed` (some already present, ensure complete)
7. **Update rate limits table** to include `/api-distribute` (60/min) and `/api-topup` (30/min)
8. **Update Prompt 4** in integration roadmap section to include `phone` field
9. **Add Path D prompts** (13-15) for distribution integration if present in web roadmap

## Files to Edit

| File | Change |
|---|---|
| `src/lib/generateApiGuidePdf.ts` | Full sync — add missing endpoints, fields, events, update version |

Single file change, no database or edge function modifications needed.

