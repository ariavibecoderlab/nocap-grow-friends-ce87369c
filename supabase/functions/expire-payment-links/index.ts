// v1.4 — Scheduled job: expire stale payment links and fire payment_link.expired webhooks.
// Runs via pg_cron (every minute). Idempotent; processes any payment_links rows
// where status='active' AND expires_at < now().

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchWebhookToMerchant } from "../_shared/webhook.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const nowIso = new Date().toISOString();

    // Pull a batch of expired-but-still-active links.
    const { data: stale, error } = await supabase
      .from('payment_links')
      .select('id, app_id, merchant_user_id, branch_id, order_id, amount, currency, expires_at')
      .eq('status', 'active')
      .lt('expires_at', nowIso)
      .limit(200);
    if (error) throw error;

    if (!stale || stale.length === 0) {
      return new Response(JSON.stringify({ expired: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ids = stale.map((l) => l.id);
    const { error: updErr } = await supabase
      .from('payment_links')
      .update({ status: 'expired' })
      .in('id', ids);
    if (updErr) throw updErr;

    // Fan out webhooks per link to the owning merchant's apps.
    await Promise.all(
      stale.map((l) =>
        dispatchWebhookToMerchant(supabase, l.merchant_user_id, l.branch_id, {
          event: 'payment_link.expired',
          merchant_id: l.merchant_user_id,
          branch_id: l.branch_id ?? null,
          data: {
            link_id: l.id,
            order_id: l.order_id ?? null,
            amount: l.amount,
            currency: l.currency,
            expires_at: l.expires_at,
          },
        }),
      ),
    );

    return new Response(JSON.stringify({ expired: stale.length, ids }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('expire-payment-links error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
