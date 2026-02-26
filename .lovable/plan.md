

# Update Integration Guide with Complete Step-by-Step for Both Systems

## Overview
Update both the markdown integration guide and PDF generator to include merchant setup steps, member actions, enhancements summary, and a new branch procedure -- covering both fresh and upgrade scenarios.

## Files to Modify

### 1. `public/nocap-api-integration-guide.md` (lines 926-1168)

Replace the entire "3rd Party Integration Roadmap" section with an expanded version containing:

**Section A: Pre-Integration -- NoCap Merchant Setup**
- Fresh: Register merchant, create branches, create merchant-level API app ("All Branches"), save credentials, set webhook URL
- Upgrade: Create NEW merchant-level API app (keep old branch-level app active during transition), share new credentials with 3rd party developer

**Section B: 3rd Party System Enhancements Required**
Summary table showing all changes needed:

| Enhancement | Fresh | Upgrade |
|---|---|---|
| nocap_connections table | New table | Add referral_code + scopes columns |
| nocap_branch_mappings table | New table | New table |
| API service layer | Build full | Add referral + branch functions |
| OAuth flow | Build with all 3 scopes | Update to include referral scope |
| Charge routing | Include branch_id | Update createCharge for branch_id |
| Re-authorization banner | Build | Build |
| Referral dashboard UI | Build | Build |
| Webhook verification | Build | No change (already implemented) |

**Section C: Member Action Required**
- Existing connected members do NOT disconnect
- System shows "Unlock Referral Rewards" banner for members missing referral scope
- One-click re-authorize via OAuth flow
- Old token auto-revoked, new token issued with all 3 scopes
- Wallet and payment features continue working throughout

**Section D: Updated Prompts 1-9**
Each prompt enhanced with "NoCap Merchant Action" and "Member Impact" notes where applicable. Prompts remain copy-paste ready.

**Section E: When a New Branch Opens in Future**
- NoCap Merchant: Create branch in dashboard -- automatically available via GET /api-branches, no credential changes needed
- 3rd Party System: Call GET /api-branches (or click "Refresh Branches"), add mapping in nocap_branch_mappings, update branch selector
- Member Impact: None -- existing tokens unaffected, payments work immediately once mapped

**Section F: Updated FAQ**
Add questions about new branch procedures and merchant-level vs branch-level apps.

### 2. `src/lib/generateApiGuidePdf.ts` (lines 349-417)

Replace the "9. 3rd Party Integration Roadmap" section with expanded content matching the markdown, adding:
- "Pre-Integration: NoCap Merchant Setup" subsection
- "3rd Party System Enhancements Required" table
- "Member Action Required" subsection
- Enhanced prompt summaries with merchant action notes
- "When a New Branch Opens" section before FAQ
- Updated FAQ with new branch questions
- Footer remains unchanged

## No Other Changes
- No database changes
- No edge function changes
- No UI component changes
- Only documentation files modified

