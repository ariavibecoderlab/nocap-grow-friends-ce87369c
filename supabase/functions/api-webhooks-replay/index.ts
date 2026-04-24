// POST /api-webhooks-replay   { delivery_id }
// Re-delivers a previously logged webhook event to the app's current webhook_url.
// Auth: server-to-server via X-Api-Key + X-Api-Secret. Merchants may only replay
// deliveries for apps they own.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { dispatchWebhook, type WebhookPayload } from '../_shared/webhook.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // ---- Auth ----
  const apiKey = req.headers.get('x-api-key');
  const apiSecret = req.headers.get('x-api-secret');
  if (!apiKey || !apiSecret) {
    return json(401, { error: 'Missing X-Api-Key or X-Api-Secret' });
  }

  const { data: app } = await supabase
    .from('api_applications')
    .select('id, merchant_user_id, is_active, api_secret_hash, webhook_url, webhook_subscriptions')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (!app || !app.is_active) return json(401, { error: 'Invalid API credentials' });
  if ((await sha256Hex(apiSecret)) !== app.api_secret_hash) {
    return json(401, { error: 'Invalid API credentials' });
  }

  // ---- Body ----
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const deliveryId = typeof body.delivery_id === 'string' ? body.delivery_id : null;
  if (!deliveryId || !/^[0-9a-f-]{36}$/i.test(deliveryId)) {
    return json(400, { error: 'delivery_id (UUID) is required' });
  }

  // ---- Rate limiting (ad-hoc, backed by check_rate_limit RPC) ----
  // Per merchant: 30 replays / minute across all deliveries.
  // Per delivery: 5 replays / minute for the same delivery_id.
  const { data: merchantOk } = await supabase.rpc('check_rate_limit', {
    p_identifier: `merchant:${app.merchant_user_id}`,
    p_endpoint: 'webhook-replay',
    p_max_requests: 30,
    p_window_seconds: 60,
  });
  if (merchantOk === false) {
    return json(429, {
      error: 'Rate limit exceeded',
      detail: 'Maximum 30 webhook replays per minute per merchant',
      retry_after_seconds: 60,
    });
  }

  const { data: deliveryOk } = await supabase.rpc('check_rate_limit', {
    p_identifier: `delivery:${deliveryId}`,
    p_endpoint: 'webhook-replay',
    p_max_requests: 5,
    p_window_seconds: 60,
  });
  if (deliveryOk === false) {
    return json(429, {
      error: 'Rate limit exceeded',
      detail: 'Maximum 5 replays per minute for the same delivery_id',
      retry_after_seconds: 60,
    });
  }

  // ---- Load original delivery (must belong to caller's app) ----
  const { data: original } = await supabase
    .from('webhook_deliveries')
    .select('id, app_id, event, payload, target_url')
    .eq('id', deliveryId)
    .eq('app_id', app.id)
    .maybeSingle();

  if (!original) return json(404, { error: 'Delivery not found' });

  if (!app.webhook_url) {
    return json(400, { error: 'No webhook_url configured for this app' });
  }

  // Use current target URL (the saved one may be stale).
  // Preserve original payload exactly so signature semantics match the original event.
  const payload = original.payload as WebhookPayload;

  // Count rows BEFORE dispatch so we can locate the new attempt row.
  const { data: before } = await supabase
    .from('webhook_deliveries')
    .select('id')
    .eq('app_id', app.id)
    .order('created_at', { ascending: false })
    .limit(1);
  const lastIdBefore = before?.[0]?.id ?? null;

  await dispatchWebhook(
    app.webhook_url,
    app.api_secret_hash,
    app.webhook_subscriptions,
    payload,
    supabase,
    app.id,
  );

  // Tag the newly inserted row with replayed_from_id and status='replayed' on success.
  const { data: latest } = await supabase
    .from('webhook_deliveries')
    .select('id, status, status_code, attempt_count')
    .eq('app_id', app.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest && latest.id !== lastIdBefore) {
    await supabase
      .from('webhook_deliveries')
      .update({
        replayed_from_id: original.id,
        status: latest.status === 'delivered' ? 'replayed' : 'failed',
      })
      .eq('id', latest.id);

    return json(200, {
      data: {
        replay_id: latest.id,
        original_id: original.id,
        event: original.event,
        delivered: latest.status === 'delivered',
        status_code: latest.status_code,
        attempts: latest.attempt_count,
      },
    });
  }

  return json(202, {
    data: {
      original_id: original.id,
      event: original.event,
      message: 'Replay dispatched but no new delivery row was recorded',
    },
  });
});
