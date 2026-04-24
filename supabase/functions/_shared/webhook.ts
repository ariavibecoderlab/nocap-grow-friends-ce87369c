// Shared webhook signer + dispatcher for v1.4 events.
// HMAC-SHA256 over the JSON body, hex digest in X-Webhook-Signature.
// Mirrors the v1.3 charge.* signing scheme exactly so existing verifiers keep working.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface WebhookPayload {
  event: string;
  merchant_id?: string;
  branch_id?: string | null;
  data: Record<string, unknown>;
  timestamp?: string;
}


async function isEventGloballyEnabled(supabase: SupabaseLike | undefined, event: string): Promise<boolean> {
  if (!supabase) return true; // No client to check ⇒ fail open (preserves prior behavior)
  try {
    const { data } = await supabase
      .from('webhook_event_settings')
      .select('is_enabled')
      .eq('event', event)
      .maybeSingle();
    // If the event isn't in the catalog, default to enabled (don't block new event types).
    if (!data) return true;
    return data.is_enabled !== false;
  } catch {
    return true;
  }
}

export async function dispatchWebhook(
  webhookUrl: string | null | undefined,
  secretHash: string,
  subscriptions: unknown,
  payload: WebhookPayload,
  supabase?: SupabaseLike,
  appId?: string,
): Promise<void> {
  if (!webhookUrl) return;

  // Platform-wide admin kill-switch
  if (!(await isEventGloballyEnabled(supabase, payload.event))) {
    console.log(`[webhook] event '${payload.event}' disabled by admin — skipping dispatch`);
    return;
  }

  // Per-event opt-in: null/undefined ⇒ subscribe to all (preserves v1.3 behavior).
  if (Array.isArray(subscriptions) && subscriptions.length > 0 && !subscriptions.includes(payload.event)) {
    return;
  }

  const body: WebhookPayload = { ...payload, timestamp: payload.timestamp ?? new Date().toISOString() };
  const startTime = Date.now();
  let lastStatus = 0;
  let delivered = false;
  let totalAttempts = 0;
  let signature = '';
  let payloadHash = '';
  let secretFingerprint = '';

  try {
    const payloadStr = JSON.stringify(body);
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payloadStr);

    // SHA-256 of the exact bytes we sign — recorded so replay can detect any
    // mutation of the stored payload before re-emitting the webhook.
    const hashBuf = await crypto.subtle.digest('SHA-256', payloadBytes);
    payloadHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    // Fingerprint (SHA-256) of the api_secret_hash used to sign THIS delivery.
    // Stored alongside the row so replay can detect a rotated secret and refuse
    // to re-dispatch instead of emitting a webhook the receiver can no longer verify.
    // Note: this is a hash-of-a-hash — the secret itself is never persisted.
    const fpBuf = await crypto.subtle.digest('SHA-256', encoder.encode(secretHash));
    secretFingerprint = Array.from(new Uint8Array(fpBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretHash),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, payloadBytes);
    signature = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      totalAttempts = attempt + 1;
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': body.event,
            'X-Webhook-Attempt': String(attempt + 1),
          },
          body: payloadStr,
        });
        await res.text();
        lastStatus = res.status;
        if (res.ok) { delivered = true; break; }
      } catch (_err) {
        lastStatus = 0;
      }
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  } catch (e) {
    console.error('dispatchWebhook error:', e);
  }

  // Log to api_request_logs (best-effort) and webhook_deliveries (for replay).
  if (supabase && appId) {
    try {
      await supabase.from('api_request_logs').insert({
        app_id: appId,
        endpoint: `webhook:${body.event}`,
        method: 'WEBHOOK',
        status_code: delivered ? (lastStatus || 200) : (lastStatus || 0),
        request_body: { url: webhookUrl, event: body.event },
        response_body: { delivered, attempts: totalAttempts, final_status: lastStatus },
        duration_ms: Date.now() - startTime,
      });
    } catch (_) { /* best-effort */ }

    // Refuse to record a delivery without a signature/payload_hash — replay
    // relies on both for integrity verification. An empty value here means
    // signing/hashing threw before reaching the dispatch loop, and there is
    // nothing meaningful to verify against later.
    if (!signature || !payloadHash) {
      console.error('[webhook] refusing to log delivery with empty signature/payload_hash', { appId, event: body.event });
    } else {
      try {
        await supabase.from('webhook_deliveries').insert({
          app_id: appId,
          event: body.event,
          payload: body,
          signature,
          payload_hash: payloadHash,
          secret_hash_fingerprint: secretFingerprint || null,
          target_url: webhookUrl,
          status: delivered ? 'delivered' : 'failed',
          attempt_count: totalAttempts,
          status_code: lastStatus,
          delivered_at: delivered ? new Date().toISOString() : null,
        });
      } catch (_) { /* best-effort */ }
    }
  }
}

// Fan out an event to every active api_application owned by a merchant
// (optionally narrowed to a specific branch). Used by internal flows like
// process-marketplace-order where there is no single "calling app".
export async function dispatchWebhookToMerchant(
  supabase: SupabaseLike,
  merchantUserId: string,
  branchId: string | null | undefined,
  payload: WebhookPayload,
): Promise<void> {
  if (!supabase || !merchantUserId) return;
  try {
    let q = supabase
      .from('api_applications')
      .select('id, api_secret_hash, webhook_url, webhook_subscriptions, branch_id')
      .eq('merchant_user_id', merchantUserId)
      .eq('is_active', true)
      .not('webhook_url', 'is', null);
    const { data: apps } = await q;
    if (!apps || apps.length === 0) return;

    // deno-lint-ignore no-explicit-any
    const targets = (apps as any[]).filter((a) => {
      // Merchant-level apps (branch_id null) receive all merchant events.
      // Branch-scoped apps only receive events for that branch.
      if (a.branch_id == null) return true;
      if (branchId == null) return false;
      return a.branch_id === branchId;
    });

    await Promise.all(
      targets.map((a) =>
        dispatchWebhook(a.webhook_url, a.api_secret_hash, a.webhook_subscriptions, payload, supabase, a.id),
      ),
    );
  } catch (e) {
    console.error('dispatchWebhookToMerchant error:', e);
  }
}

