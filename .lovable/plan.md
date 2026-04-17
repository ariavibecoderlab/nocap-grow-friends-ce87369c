
The user wants a way to verify the end-to-end correctness of the cashback + 6-tier commission distribution. The best approach is a dedicated **Admin Distribution Audit** view that traces a single payment from charge → distribution → cashback + 5 tier commissions, showing every wallet movement and the math behind it.

Let me check what already exists. From context: `MerchantDistributions.tsx` already shows a per-merchant view of distributions with breakdown. There's also `AdminDashboard`, `TransactionsList`, `api-distribute` edge function, and the 6-tier commission engine (`mem://logic/commission-engine`: 1/6 split, RM0.01 min).

What's missing for proper debugging:
1. A single **traceable view** that takes any payment/charge and shows the full distribution chain
2. Side-by-side **expected vs actual** math (so the user can confirm correctness)
3. **Wallet movement verification** (debit from branch == sum of credits to member + 5 referrers)
4. Coverage of edge cases: missing referrers, RM0.01 minimum, sandbox vs live

Plan: Build an Admin-only "Distribution Audit" tool inside the Admin Portal.
