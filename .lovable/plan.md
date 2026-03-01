

## Update Top-Up Amount Limits: RM10 - RM500

Change the minimum top-up amount from RM1 to RM10 and the maximum from RM10,000 to RM500 across all relevant files.

### Changes Required

**1. Frontend - `src/pages/TopUp.tsx`**
- Update validation message and input constraints (min=10, max=500)
- Update helper text from "Min RM1.00 · Max RM10,000.00" to "Min RM10.00 · Max RM500.00"
- Update preset amounts to fit new range (e.g., remove 500 if desired, or keep as max)
- Update validation check in `handleTopUp` from `< 1 || > 10000` to `< 10 || > 500`

**2. Backend - `supabase/functions/create-topup-bill/index.ts`**
- Update server-side validation from `amount < 1 || amount > 10000` to `amount < 10 || amount > 500`
- Update error message to "Amount must be between RM10 and RM500"

**3. New Edge Function - `supabase/functions/api-topup/index.ts`** (from the planned feature)
- Apply the same RM10-RM500 limits in the new API endpoint

### Technical Details

Files to modify:
- `src/pages/TopUp.tsx`: Lines with amount validation, preset amounts array, helper text, and input min/max attributes
- `supabase/functions/create-topup-bill/index.ts`: Server-side validation block
- Preset amounts array will be updated to `[10, 20, 50, 100, 200, 500]` (already fits the new range)

