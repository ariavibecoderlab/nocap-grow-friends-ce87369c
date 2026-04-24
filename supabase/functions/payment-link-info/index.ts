// v1.4 — Public read endpoint for the hosted /pay/:linkId page.
// Returns the minimum info the checkout page needs WITHOUT exposing credentials
// or merchant internals.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'id query param required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: link } = await supabase
      .from('payment_links')
      .select('id, amount, currency, status, expires_at, description, order_id, merchant_user_id, paid_at')
      .eq('id', id).maybeSingle();
    if (!link) {
      return new Response(JSON.stringify({ error: 'Payment link not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pull merchant + (optional) order summary for buyer trust
    let merchantName: string | null = null;
    const { data: app } = await supabase
      .from('merchant_applications').select('business_name').eq('user_id', link.merchant_user_id).maybeSingle();
    if (app) merchantName = app.business_name;

    let order: Record<string, unknown> | null = null;
    if (link.order_id) {
      const { data: o } = await supabase
        .from('marketplace_orders')
        .select('id, order_number, total_amount, payment_status, status')
        .eq('id', link.order_id).maybeSingle();
      order = o ?? null;
    }

    const expired = new Date(link.expires_at).getTime() < Date.now() && link.status === 'active';
    return new Response(JSON.stringify({
      id: link.id,
      amount: link.amount,
      currency: link.currency,
      status: expired ? 'expired' : link.status,
      expires_at: link.expires_at,
      description: link.description,
      paid_at: link.paid_at,
      merchant_name: merchantName,
      order,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
