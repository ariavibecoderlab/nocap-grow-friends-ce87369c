Reset the password for the account `nocap@drecoffee.com` to `user12345` using the Supabase Admin API.

## Steps
1. Look up the user by email in `auth.users` to confirm the account exists.
2. Run an admin password update via a one-off call using the service role key (through an edge function invocation or the supabase admin API) to set the password to `user12345`.
3. Update `profiles.has_password = true` for that user so the app reflects the password is set.
4. Confirm to the user that the password has been reset and they can log in with the new credentials.

## Notes
- Password length (9 chars) meets the minimum 6/8 requirements.
- No schema or code changes are needed — this is a one-off admin data operation.