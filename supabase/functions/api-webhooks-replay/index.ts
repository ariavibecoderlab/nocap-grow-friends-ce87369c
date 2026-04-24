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
  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const deliveryId = typeof body.delivery_id === 'string' ? body.delivery_id : null;
  if (!deliveryId || !/^[0-9a-f-]{36}$/i.test(deliveryId)) {
    return json(400, { error: 'delivery_id (UUID) is required' });
  }

  // ---- Idempotency-Key handling ----
  // If client sends Idempotency-Key, return cached response for repeats within 24h.
  // Mismatched body for the same key returns 409.
  const idempotencyKey = req.headers.get('idempotency-key')?.trim() || null;
  let requestHash: string | null = null;
  if (idempotencyKey) {
    if (idempotencyKey.length > 255) {
      return json(400, { error: 'Idempotency-Key must be <= 255 chars' });
    }
    requestHash = await sha256Hex(rawBody);

    // Purge expired rows opportunistically (best-effort).
    await supabase
      .from('webhook_replay_idempotency')
      .delete()
      .lt('expires_at', new Date().toISOString());

    const { data: cached } = await supabase
      .from('webhook_replay_idempotency')
      .select('request_hash, response_status, response_body')
      .eq('app_id', app.id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (cached) {
      if (cached.request_hash !== requestHash) {
        return json(409, {
          error: 'Idempotency-Key reused with different request body',
        });
      }
      return new Response(JSON.stringify(cached.response_body), {
        status: cached.response_status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Idempotent-Replay': 'true',
        },
      });
    }
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
    .select('id, app_id, event, payload, target_url, signature, payload_hash')
    .eq('id', deliveryId)
    .eq('app_id', app.id)
    .maybeSingle();

  if (!original) return json(404, { error: 'Delivery not found' });

  if (!app.webhook_url) {
    return json(400, { error: 'No webhook_url configured for this app' });
  }

  // ---- Server-side payload + signature integrity check ----
  // The replay MUST send byte-identical payload to the original event. We
  // verify integrity in three layers:
  //   1) payload_hash: SHA-256 of stored payload bytes matches the hash
  //      recorded at first dispatch ⇒ proves the stored row was not mutated.
  //   2) event match:  payload.event matches the delivery row's event column.
  //   3) signature:    recomputed HMAC (current secret) matches the signature
  //      recorded at first dispatch ⇒ proves the secret has not been rotated.
  const payload = original.payload as WebhookPayload;
  let serializedPayload: string;
  try {
    serializedPayload = JSON.stringify(payload);
  } catch {
    return json(422, { error: 'Original payload is not serializable' });
  }
  if (!payload || typeof payload !== 'object' || payload.event !== original.event) {
    return json(422, {
      error: 'Payload integrity check failed',
      detail: 'Stored payload event does not match delivery event',
    });
  }

  const payloadBytes = new TextEncoder().encode(serializedPayload);

  // (1) Payload hash check — runs BEFORE signing, so we never sign tampered bytes.
  const hashBuf = await crypto.subtle.digest('SHA-256', payloadBytes);
  const recomputedPayloadHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (!original.payload_hash) {
    return json(409, {
      error: 'Payload integrity check failed',
      detail:
        'Original delivery has no recorded payload_hash, so byte-level integrity cannot be verified. Re-trigger the source event instead of replaying this row.',
    });
  }
  if (original.payload_hash !== recomputedPayloadHash) {
    return json(409, {
      error: 'Payload integrity check failed',
      detail:
        'Stored payload SHA-256 does not match the hash recorded at first dispatch. The webhook_deliveries row appears to have been modified. Replay refused.',
      original_payload_hash_prefix: original.payload_hash.slice(0, 12),
      recomputed_payload_hash_prefix: recomputedPayloadHash.slice(0, 12),
    });
  }

  // (3) Recompute HMAC-SHA256 over the exact serialized bytes using current secret.
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(app.api_secret_hash),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, payloadBytes);
  const recomputedSignature = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (!original.signature) {
    return json(409, {
      error: 'Signature integrity check failed',
      detail:
        'Original delivery has no recorded signature, so replay integrity cannot be verified. Re-trigger the source event instead of replaying this row.',
    });
  }
  if (original.signature !== recomputedSignature) {
    return json(409, {
      error: 'Signature integrity check failed',
      detail:
        'Recomputed signature does not match the original. The API secret may have been rotated since the original delivery. Replay refused to avoid emitting an unverifiable webhook.',
      original_signature_prefix: original.signature.slice(0, 12),
      recomputed_signature_prefix: recomputedSignature.slice(0, 12),
    });
  }

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

  const cacheResult = async (status: number, payload: unknown, replayId: string | null) => {
    if (idempotencyKey && requestHash) {
      await supabase.from('webhook_replay_idempotency').insert({
        app_id: app.id,
        idempotency_key: idempotencyKey,
        request_hash: requestHash,
        response_status: status,
        response_body: payload,
        replay_id: replayId,
        original_delivery_id: original.id,
      });
    }
  };

  if (latest && latest.id !== lastIdBefore) {
    await supabase
      .from('webhook_deliveries')
      .update({
        replayed_from_id: original.id,
        status: latest.status === 'delivered' ? 'replayed' : 'failed',
      })
      .eq('id', latest.id);

    const responseBody = {
      data: {
        replay_id: latest.id,
        original_id: original.id,
        event: original.event,
        delivered: latest.status === 'delivered',
        status_code: latest.status_code,
        attempts: latest.attempt_count,
      },
    };
    await cacheResult(200, responseBody, latest.id);
    return json(200, responseBody);
  }

  const fallbackBody = {
    data: {
      original_id: original.id,
      event: original.event,
      message: 'Replay dispatched but no new delivery row was recorded',
    },
  };
  await cacheResult(202, fallbackBody, null);
  return json(202, fallbackBody);
});
