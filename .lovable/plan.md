

## Plan: Complete Support Ticketing System with Dedicated Support Agent Role

### Overview
Build a ticketing system managed by a new **"support"** role (not the existing "admin" role). Support agents will have their own login portal and dashboard, completely separate from the admin portal.

### Database Changes (1 migration)

**1. Add `support` to `app_role` enum**
```sql
ALTER TYPE public.app_role ADD VALUE 'support';
```

**2. Create `support_tickets` table**
- id (uuid, PK), ticket_number (text, auto-generated TK-000001), user_id (uuid, submitter), subject, description, category (general/billing/technical/account/marketplace), priority (low/medium/high/urgent), status (open/in_progress/resolved/closed), assigned_to (uuid, nullable — support agent), created_at, updated_at

**3. Create `support_ticket_replies` table**
- id, ticket_id, sender_id, sender_type (user/agent), message, attachments (jsonb — array of file URLs), created_at

**4. Create storage bucket `support-attachments`** (private)
- Users can upload to their own ticket path; support agents can access all

**5. Create sequence for ticket numbers**
```sql
CREATE SEQUENCE support_ticket_seq START 1;
```
Default for ticket_number: `'TK-' || LPAD(nextval('support_ticket_seq')::text, 6, '0')`

**6. RLS Policies**
- `support_tickets`: Users SELECT/INSERT own tickets; support agents (`has_role(uid, 'support')`) can SELECT/UPDATE all; admins can SELECT all
- `support_ticket_replies`: Users SELECT/INSERT on own tickets; support agents SELECT/INSERT on all
- Storage: ticket owner and support agents can read/write attachments

**7. Enable realtime** on `support_ticket_replies`

**8. Notification trigger**: On new reply, insert into `notifications` table for the other party

### Frontend — User Side

**`src/pages/SupportTickets.tsx`** — List of user's tickets with status filters and "New Ticket" button

**`src/pages/SupportTicketDetail.tsx`** — Single ticket view with:
- Ticket info header (number, status, priority, category)
- Threaded reply conversation with timestamps and sender labels
- Reply input with file upload (images/videos, max 5 files, 20MB each)
- Realtime subscription for live updates

**`src/components/support/CreateTicketForm.tsx`** — Dialog with subject, category, priority, description, and file attachments

Add "My Tickets" link to Help & Support page and Profile settings menu.

### Frontend — Support Agent Portal (separate from Admin)

**`src/pages/SupportLogin.tsx`** — Dedicated login page for support agents (email/password, checks for `support` role)

**`src/pages/SupportPortal.tsx`** — Sidebar layout (similar pattern to AdminPortal) with:
- Dashboard: open ticket count, assigned to me, unassigned
- Ticket queue: filterable by status, priority, assigned agent
- Ticket detail: reply as agent, change status/priority, assign/reassign to other support agents

**`src/components/support/SupportSidebar.tsx`** — Navigation sidebar

**`src/components/support/SupportTicketQueue.tsx`** — Queue management with filters and bulk actions

**`src/components/support/SupportTicketView.tsx`** — Agent view of ticket with reply, status controls, and assignment dropdown (lists all users with `support` role)

### Routing
- `/support-tickets` — member/merchant ticket list
- `/support-tickets/:ticketId` — ticket detail
- `/support-login` — support agent login
- `/support-portal` — support dashboard
- `/support-portal/tickets` — ticket queue
- `/support-portal/tickets/:ticketId` — agent ticket view

### Key Design Decisions
- Support agents are a **completely separate role** from admins — admins cannot manage tickets (unless also given the support role)
- Existing admin portal is untouched
- Support agents manage tickets through their own portal with their own login
- The existing `has_role` security definer function works with the new enum value automatically
- Members and merchants both submit tickets from the same UI (accessible from Help & Support)

### Technical Details
- `app_role` enum extended with `'support'` — no existing code breaks since it's additive
- File uploads compressed with existing `compressImage` utility before upload
- Realtime on replies for live chat experience
- Ticket assignment dropdown populated by querying `user_roles` where `role = 'support'` joined with `profiles` for names

