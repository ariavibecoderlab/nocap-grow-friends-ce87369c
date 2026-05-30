-- Phase 6: Live Shopping tables
-- Backfilled from live DB on 2026-05-31 (originally applied via Supabase MCP)
--
-- Tables: live_streams, live_stream_products, live_stream_chat, live_stream_reminders
-- RPCs:   increment_viewer_count, decrement_viewer_count  (see 20260527120000_phase6_viewer_count_rpcs.sql)

-- ── live_streams ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_streams (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid        NOT NULL REFERENCES marketplace_stores(id) ON DELETE CASCADE,
  seller_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  description      text,
  thumbnail_url    text,
  status           text        NOT NULL DEFAULT 'scheduled'
                               CHECK (status IN ('scheduled','live','ended')),
  viewer_count     integer     NOT NULL DEFAULT 0,
  peak_viewers     integer     NOT NULL DEFAULT 0,
  livekit_room     text        UNIQUE,
  recording_url    text,
  scheduled_at     timestamptz,
  started_at       timestamptz,
  ended_at         timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_streams_store  ON live_streams(store_id, status);

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Anyone can view live/scheduled streams
CREATE POLICY "public_read_active_streams"
  ON live_streams FOR SELECT
  USING (status IN ('live','scheduled'));

-- Sellers manage their own streams
CREATE POLICY "seller_manage_own_streams"
  ON live_streams FOR ALL
  USING (seller_user_id = auth.uid())
  WITH CHECK (seller_user_id = auth.uid());

-- ── live_stream_products ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_stream_products (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id   uuid        NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  live_price  numeric,
  live_stock  integer,
  sold_count  integer     NOT NULL DEFAULT 0,
  is_pinned   boolean     NOT NULL DEFAULT false,
  position    integer     NOT NULL DEFAULT 0,
  added_at    timestamptz DEFAULT now(),
  UNIQUE (stream_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_live_stream_products_stream
  ON live_stream_products(stream_id, is_pinned DESC);

ALTER TABLE live_stream_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_stream_products"
  ON live_stream_products FOR SELECT USING (true);

CREATE POLICY "seller_manage_stream_products"
  ON live_stream_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM live_streams ls
      WHERE ls.id = stream_id AND ls.seller_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_streams ls
      WHERE ls.id = stream_id AND ls.seller_user_id = auth.uid()
    )
  );

-- ── live_stream_chat ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_stream_chat (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id    uuid        NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES auth.users(id),
  display_name text        NOT NULL DEFAULT 'Guest',
  message      text        NOT NULL,
  is_pinned    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_stream_chat_stream
  ON live_stream_chat(stream_id, created_at DESC);

ALTER TABLE live_stream_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_chat"
  ON live_stream_chat FOR SELECT USING (true);

CREATE POLICY "authenticated_insert_chat"
  ON live_stream_chat FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ── live_stream_reminders ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_stream_reminders (
  stream_id  uuid NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (stream_id, user_id)
);

ALTER TABLE live_stream_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_manage_own_reminders"
  ON live_stream_reminders FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
