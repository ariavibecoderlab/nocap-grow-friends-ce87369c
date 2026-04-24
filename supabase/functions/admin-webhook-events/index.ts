import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      const { data, error } = await admin
        .from('webhook_event_settings')
        .select('event, is_enabled, description, updated_at, updated_by')
        .order('event');
      if (error) throw error;
      return new Response(JSON.stringify({ events: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const body = await req.json();
      // Accept either { event, is_enabled, description? } or { events: [{...}] }
      const updates: Array<{ event: string; is_enabled?: boolean; description?: string }> =
        Array.isArray(body?.events) ? body.events : [body];

      const cleaned = updates
        .filter((u) => u && typeof u.event === 'string' && u.event.length > 0)
        .map((u) => ({
          event: u.event,
          is_enabled: typeof u.is_enabled === 'boolean' ? u.is_enabled : true,
          description: typeof u.description === 'string' ? u.description : null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        }));

      if (cleaned.length === 0) {
        return new Response(JSON.stringify({ error: 'No valid event updates provided' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await admin
        .from('webhook_event_settings')
        .upsert(cleaned, { onConflict: 'event' })
        .select('event, is_enabled, description, updated_at');
      if (error) throw error;

      console.log(`[admin-webhook-events] ${userId} updated ${cleaned.length} events`);
      return new Response(JSON.stringify({ updated: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const event = url.searchParams.get('event');
      if (!event) {
        return new Response(JSON.stringify({ error: 'event query parameter required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await admin.from('webhook_event_settings').delete().eq('event', event);
      if (error) throw error;
      return new Response(JSON.stringify({ deleted: event }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[admin-webhook-events] error:', e);
    const msg = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
