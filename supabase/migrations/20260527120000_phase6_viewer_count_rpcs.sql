-- Phase 6: Atomic viewer-count helpers for live streams
-- Applied via Supabase MCP on 2026-05-27
--
-- RPCs: increment_viewer_count(p_stream_id) → void
--       decrement_viewer_count(p_stream_id) → void  (clamped to 0)

CREATE OR REPLACE FUNCTION increment_viewer_count(p_stream_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE live_streams
  SET viewer_count = viewer_count + 1
  WHERE id = p_stream_id AND status = 'live';
$$;

CREATE OR REPLACE FUNCTION decrement_viewer_count(p_stream_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE live_streams
  SET viewer_count = GREATEST(viewer_count - 1, 0)
  WHERE id = p_stream_id AND status = 'live';
$$;

GRANT EXECUTE ON FUNCTION increment_viewer_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION decrement_viewer_count(uuid) TO anon, authenticated;
