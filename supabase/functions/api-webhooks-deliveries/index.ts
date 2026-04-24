// GET /api-webhooks-deliveries
// Lists webhook delivery attempts for the calling app.
// Query params: ?event=order.paid&status=failed&limit=50
// Auth: X-Api-Key + X-Api-Secret (server-to-server)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    const apiSecret = req.headers.get('x-api-secret');
    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing X-Api-Key or X-Api-Secret' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const secretHash = await sha256Hex(apiSecret);
    const { data: app } = await supabase
      .from('api_applications')
      .select('id')
      .eq('api_key', apiKey)
      .eq('api_secret_hash', secretHash)
      .eq('is_active', true)
      .maybeSingle();

    if (!app) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const event = url.searchParams.get('event');
    const status = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    let q = supabase
      .from('webhook_deliveries')
      .select('id, event, target_url, status, status_code, attempt_count, last_error, signature, delivered_at, next_retry_at, created_at, replayed_from_id')
      .eq('app_id', app.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (event) q = q.eq('event', event);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ deliveries: data ?? [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
