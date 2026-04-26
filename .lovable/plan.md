Plan to add RM 500 to Azarul Hakim’s member wallet

Current verified details:
- Email: azarul@brainybunch.com
- User ID: 59dfea5c-75c7-42a7-90ed-d4b511c87474
- Target wallet: member wallet
- Wallet ID: 7a434f6e-194a-4743-9de8-785c37e7e0bb
- Current member VA balance: RM 20.50
- Expected balance after credit: RM 520.50

Implementation steps after approval:
1. Credit RM 500 to the member wallet using the existing database wallet credit mechanism, not a direct unsafe balance overwrite.
2. Create a matching transaction record for audit/history, marked completed, describing the manual wallet credit.
3. Verify the final VA balance and transaction entry after the update.

Technical details:
- Use the existing `credit_wallet` database function if available for atomic balance update.
- Insert a `transactions` row with `user_id = 59dfea5c-75c7-42a7-90ed-d4b511c87474`, `type` suitable for wallet credit/top-up/manual adjustment, `amount = 500`, and `status = completed`.
- Avoid changing schema or app code; this is a one-time data operation only.