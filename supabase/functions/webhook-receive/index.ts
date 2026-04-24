import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-app-id, x-webhook-timestamp',
};

type SignatureStatus = 'verified' | 'invalid' | 'missing_signature' | 'missing_app' | 'missing_secret' | 'stale_timestamp';

async function computeHmacHex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time string compare to prevent timing attacks
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Read raw body once — required for HMAC over exact bytes
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-webhook-signature') || '';
  const appIdHeader = req.headers.get('x-webhook-app-id') || '';
  const timestampHeader = req.headers.get('x-webhook-timestamp') || '';

  let signatureStatus: SignatureStatus = 'missing_signature';
  let appId: string | null = null;
  let parsedBody: unknown = null;
  try { parsedBody = rawBody ? JSON.parse(rawBody) : null; } catch { /* keep null */ }

  // Optional anti-replay window (5 min) when a timestamp header is provided
  if (timestampHeader) {
    const ts = Number(timestampHeader);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      signatureStatus = 'stale_timestamp';
    }
  }

  if (signatureStatus !== 'stale_timestamp') {
    if (!appIdHeader) {
      signatureStatus = 'missing_app';
    } else if (!signatureHeader) {
      signatureStatus = 'missing_signature';
    } else {
      const { data: app } = await supabase
        .from('api_applications')
        .select('id, api_secret_hash, is_active')
        .eq('id', appIdHeader)
        .maybeSingle();

      if (!app || !app.is_active) {
        signatureStatus = 'missing_app';
      } else if (!app.api_secret_hash) {
        signatureStatus = 'missing_secret';
      } else {
        appId = app.id;
        // Sign timestamp+body if timestamp present, else just body
        const signingInput = timestampHeader ? `${timestampHeader}.${rawBody}` : rawBody;
        const expected = await computeHmacHex(app.api_secret_hash, signingInput);
        // Allow optional "sha256=" prefix
        const provided = signatureHeader.replace(/^sha256=/i, '').toLowerCase();
        signatureStatus = safeEqual(provided, expected) ? 'verified' : 'invalid';
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(`[webhook-verify] inbound app_id=${appId ?? 'none'} signature_status=${signatureStatus} duration_ms=${durationMs} bytes=${rawBody.length}`);

  // Persist a request log so merchants can see verification status
  if (appId) {
    await supabase.from('api_request_logs').insert({
      app_id: appId,
      endpoint: 'webhook-receive',
      method: 'POST',
      status_code: signatureStatus === 'verified' ? 200 : 401,
      request_body: { headers: { 'x-webhook-app-id': appIdHeader, has_signature: !!signatureHeader, has_timestamp: !!timestampHeader }, body: parsedBody },
      response_body: { signature_status: signatureStatus },
      duration_ms: durationMs,
    });
  }

  if (signatureStatus !== 'verified') {
    return new Response(JSON.stringify({ error: 'Signature verification failed', signature_status: signatureStatus }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, signature_status: signatureStatus, received_at: new Date().toISOString() }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
