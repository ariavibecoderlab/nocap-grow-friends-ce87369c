// v1.4 Webhook Subscription Management
// GET  /api-webhooks/subscriptions   -> { webhook_url, subscriptions, available_events }
// POST /api-webhooks/subscriptions   -> body: { subscriptions?: string[] | null, webhook_url?: string }
//
// Auth: server-to-server X-Api-Key + X-Api-Secret (additive; v1.3 endpoints unchanged).
// `subscriptions = null` means "all events" (preserves v1.3 default behavior).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const AVAILABLE_EVENTS = [
  // v1.3 (unchanged)
  'charge.created',
  'charge.completed',
  'charge.failed',
  'charge.refunded',
  // v1.4 — products
  'product.created',
  'product.updated',
  'product.stock_changed',
  // v1.4 — orders
  'order.created',
  'order.paid',
  'order.shipped',
  'order.delivered',
  'order.cancelled',
  'order.refunded',
  // v1.4 — payment links
  'payment_link.paid',
  'payment_link.expired',
];

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // --- Auth: X-Api-Key + X-Api-Secret ---
  const apiKey = req.headers.get('x-api-key');
  const apiSecret = req.headers.get('x-api-secret');
  if (!apiKey || !apiSecret) {
    return json({ error: 'Missing X-Api-Key or X-Api-Secret' }, 401);
  }

  const { data: app, error: appErr } = await supabase
    .from('api_applications')
    .select('id, api_secret_hash, is_active, webhook_url, webhook_subscriptions, merchant_user_id')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (appErr || !app || !app.is_active) {
    return json({ error: 'Invalid or inactive API key' }, 401);
  }

  const secretHash = await sha256Hex(apiSecret);
  if (secretHash !== app.api_secret_hash) {
    return json({ error: 'Invalid API secret' }, 401);
  }

  const url = new URL(req.url);
  const isSubsRoute = url.pathname.endsWith('/subscriptions') || url.pathname.endsWith('/api-webhooks');

  if (!isSubsRoute) {
    return json({ error: 'Not found' }, 404);
  }

  // --- GET ---
  if (req.method === 'GET') {
    const subs = app.webhook_subscriptions;
    return json({
      webhook_url: app.webhook_url,
      // null/undefined => subscribed to all (v1.3-compatible default)
      subscriptions: Array.isArray(subs) ? subs : null,
      subscribed_to_all: !Array.isArray(subs),
      available_events: AVAILABLE_EVENTS,
    });
  }

  // --- POST ---
  if (req.method === 'POST') {
    let body: { subscriptions?: unknown; webhook_url?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const update: Record<string, unknown> = {};

    // subscriptions: null => all; array => per-event opt-in
    if ('subscriptions' in body) {
      const s = body.subscriptions;
      if (s === null) {
        update.webhook_subscriptions = null;
      } else if (Array.isArray(s)) {
        const invalid = s.filter((e) => typeof e !== 'string' || !AVAILABLE_EVENTS.includes(e));
        if (invalid.length > 0) {
          return json(
            { error: 'Unknown event(s)', invalid, available_events: AVAILABLE_EVENTS },
            400,
          );
        }
        // dedupe + sort for stable storage
        update.webhook_subscriptions = Array.from(new Set(s as string[])).sort();
      } else {
        return json({ error: 'subscriptions must be null or string[]' }, 400);
      }
    }

    // webhook_url: optional update; basic shape check
    if ('webhook_url' in body) {
      const u = body.webhook_url;
      if (u === null || u === '') {
        update.webhook_url = null;
      } else if (typeof u === 'string') {
        try {
          const parsed = new URL(u);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return json({ error: 'webhook_url must be http(s)' }, 400);
          }
          update.webhook_url = u;
        } catch {
          return json({ error: 'webhook_url is not a valid URL' }, 400);
        }
      } else {
        return json({ error: 'webhook_url must be string or null' }, 400);
      }
    }

    if (Object.keys(update).length === 0) {
      return json({ error: 'Nothing to update' }, 400);
    }

    const { data: updated, error: updErr } = await supabase
      .from('api_applications')
      .update(update)
      .eq('id', app.id)
      .select('webhook_url, webhook_subscriptions')
      .single();

    if (updErr) {
      return json({ error: 'Update failed', detail: updErr.message }, 500);
    }

    const subs = updated.webhook_subscriptions;
    return json({
      webhook_url: updated.webhook_url,
      subscriptions: Array.isArray(subs) ? subs : null,
      subscribed_to_all: !Array.isArray(subs),
      available_events: AVAILABLE_EVENTS,
    });
  }

  return json({ error: 'Method not allowed' }, 405);
});
