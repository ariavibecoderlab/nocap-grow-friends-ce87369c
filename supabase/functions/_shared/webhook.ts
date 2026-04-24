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

export async function dispatchWebhook(
  webhookUrl: string | null | undefined,
  secretHash: string,
  subscriptions: unknown,
  payload: WebhookPayload,
  supabase?: SupabaseLike,
  appId?: string,
): Promise<void> {
  if (!webhookUrl) return;

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

  try {
    const payloadStr = JSON.stringify(body);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretHash),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
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

    try {
      await supabase.from('webhook_deliveries').insert({
        app_id: appId,
        event: body.event,
        payload: body,
        signature,
        target_url: webhookUrl,
        status: delivered ? 'delivered' : 'failed',
        attempts: totalAttempts,
        last_status_code: lastStatus,
        last_attempted_at: new Date().toISOString(),
      });
    } catch (_) { /* best-effort: table may not exist in older envs */ }
  }
}
