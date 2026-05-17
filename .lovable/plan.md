# Backend Backup — NOcap

Produce a complete, timestamped backup of the Lovable Cloud backend into `/mnt/documents/nocap-backup-<timestamp>/` with a manifest and README.

## What gets backed up

1. **Database schema** — every table definition, indexes, constraints, sequences, enums, views (from `information_schema` + `pg_catalog`).
2. **RLS policies** — all policies on every `public` table (from `pg_policies`), plus RLS enabled/disabled state per table.
3. **Database functions & triggers** — full SQL source for all `public` functions and triggers (from `pg_proc` / `pg_trigger`).
4. **Table data** — full row export of every `public` table as CSV (one file per table) and a combined JSON snapshot for small tables.
5. **Users** — `auth.users` export (id, email, phone, created_at, last_sign_in_at, metadata) via SECURITY DEFINER query. Passwords are hashed and never exportable in plaintext — documented in README.
6. **User roles** — full dump of `public.user_roles`.
7. **Secrets** — names only (values are encrypted and never readable). List from `secrets--fetch_secrets`.
8. **Edge functions** — copy every `supabase/functions/*` directory verbatim into the backup.
9. **Storage buckets** — list buckets + object inventory (path, size, mime, created_at) per bucket. Binary object download is optional (see Options).
10. **Config** — `supabase/config.toml`, `.env` (publishable keys only), migration files under `supabase/migrations/`.

## Output structure

```text
/mnt/documents/nocap-backup-<YYYYMMDD-HHMM>/
  README.md
  manifest.json                  # counts, sizes, checksums
  schema/
    tables.sql                   # CREATE TABLE statements
    indexes.sql
    enums.sql
    views.sql
    functions.sql
    triggers.sql
    rls_policies.sql             # CREATE POLICY statements (restorable)
    rls_policies.json            # structured view
  data/
    <table>.csv                  # one per public table
    auth_users.csv
    user_roles.csv
  storage/
    buckets.json
    <bucket>/inventory.csv
  edge-functions/                # full copy of supabase/functions
  config/
    config.toml
    env.publishable.txt
    migrations/                  # copy of supabase/migrations
  secrets/
    secret-names.txt             # names only, no values
```

## Method

- Use `psql` (PG* env vars available) to dump schema, policies, functions, triggers, and per-table CSV via `COPY ... TO STDOUT`.
- Use service-role REST/SDK only where `psql` cannot reach (storage inventory) — driven from a Node script in `/tmp`.
- Copy edge functions, config, and migrations with `cp -r` from the repo.
- Generate `manifest.json` with row counts and SHA-256 of each file.
- Zip the whole folder as `nocap-backup-<timestamp>.zip` next to it for easy download.

## Options to confirm

1. **Storage objects** — include actual file downloads (avatars, marketplace-assets, merchant-documents, support-attachments)? This can be large (potentially GB). Default: inventory only.
2. **Data scope** — full table dumps vs. schema+sample (first 1000 rows per table)? Default: full dumps.
3. **Format** — also produce a single restorable `pg_dump`-style SQL file? `pg_dump` binary is not available in the sandbox; we'd assemble an equivalent from `psql` queries. Default: yes, assemble `restore.sql`.

## Deliverables

- The backup folder under `/mnt/documents/`
- A `.zip` archive of the folder
- `<presentation-artifact>` tags for the zip and the README so the user can download/preview
