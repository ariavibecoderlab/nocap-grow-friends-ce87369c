

## Plan: Add Merchant Commission Rate Self-Service Setting

### What changes
Currently, the commission rate is displayed as read-only text in the merchant Settings tab. We will make it editable inline, allowing merchants to change their branch commission rate at any time.

### Implementation

**File: `src/pages/MerchantDashboard.tsx`**

1. Add state for editing commission: `editingCommission` (boolean), `commissionValue` (string), and `savingCommission` (boolean).

2. Replace the static commission rate display (lines 740-743) with an inline edit pattern:
   - Default view: shows current rate with an "Edit" button (pencil icon)
   - Edit mode: shows a number input (0-20 range, step 0.5) with Save and Cancel buttons
   
3. On Save:
   - Validate the value is between 0 and 20
   - Call `supabase.from("merchant_branches").update({ commission_percent: newValue }).eq("id", selectedBranch.id).eq("merchant_user_id", user.id)`
   - Update local `branches` state to reflect the change
   - Show a success toast
   - Exit edit mode

### Technical Details

- The `merchant_branches` table already has an RLS policy "Merchants can update own branches" allowing merchants to update their own branches
- The `commission_percent` column accepts numeric values; the admin FeeSettings uses a 0-20 range — we will use the same constraint
- No database migration needed — existing schema and policies support this

