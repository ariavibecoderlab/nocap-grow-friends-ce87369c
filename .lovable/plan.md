

# Add Date Range Filters to Audit Log Tab

## Overview
Add "From" and "To" date pickers to the Audit Log tab in `WalletReconciliation.tsx`, allowing admins to filter audit entries by time period. The date range will be applied server-side (in the Supabase query) for efficiency, and a "Clear" button will reset the filters.

## Changes

### File: `src/components/admin/WalletReconciliation.tsx`

1. **Add state** for `dateFrom` and `dateTo` (both `Date | undefined`, defaulting to `undefined`)

2. **Add date range to the query key and query function**:
   - Include `dateFrom` and `dateTo` in the `queryKey` so the query re-fetches when dates change
   - Apply `.gte("changed_at", dateFrom.toISOString())` and `.lte("changed_at", dateTo + end-of-day)` filters to the Supabase query when set
   - Remove the hard `limit(200)` when a date range is active (keep it as fallback when no range is set)

3. **Add date picker UI** between the search bar and the results count:
   - Two date pickers side by side ("From" / "To") using the Popover + Calendar pattern from shadcn
   - A small "Clear dates" button that appears when either date is set
   - Quick-select buttons: "Today", "Last 7 days", "Last 30 days" for convenience

4. **Update the results count text** to reflect the active filter (e.g., "42 entries (filtered by date)" vs "200 entries (latest 200)")

5. **Add imports**: `format` from `date-fns`, `CalendarIcon` from `lucide-react`, `Calendar` from UI, `Popover`/`PopoverTrigger`/`PopoverContent` from UI, `startOfDay`/`endOfDay`/`subDays` from `date-fns`

### Technical Details

```text
Filter bar layout:
+--[Search input]-----------------------------------+
+--[From: pick date]--+--[To: pick date]--+--[Clear]+
+--[Today] [7 days] [30 days]--+                     
+--42 entries (filtered)-------+                     
```

- Dates are applied server-side via Supabase `.gte()` / `.lte()` for performance
- The Calendar component will include `pointer-events-auto` class per shadcn guidelines
- When `dateTo` is set, we use `endOfDay(dateTo)` to include the full selected day
- The existing text search filter still applies client-side on top of the server-side date filter
- No database changes required -- uses the existing `changed_at` column which is already indexed by default ordering

