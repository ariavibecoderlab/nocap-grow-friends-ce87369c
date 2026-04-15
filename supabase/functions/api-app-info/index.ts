import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const appId = url.searchParams.get('app_id');

    if (!appId) {
      return new Response(JSON.stringify({ error: 'app_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Try lookup by UUID id first
    let { data: app } = await supabase
      .from('api_applications')
      .select('id, name, is_active')
      .eq('id', appId)
      .eq('is_active', true)
      .maybeSingle();

    // Fallback: caller may have passed the api_key hex string instead of UUID
    if (!app) {
      const { data: appByKey } = await supabase
        .from('api_applications')
        .select('id, name, is_active')
        .eq('api_key', appId)
        .eq('is_active', true)
        .maybeSingle();
      app = appByKey;
    }

    if (!app) {
      return new Response(JSON.stringify({ error: 'App not found or inactive' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ id: app.id, name: app.name }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
