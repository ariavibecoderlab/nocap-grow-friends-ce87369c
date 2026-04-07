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
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return new Response(JSON.stringify({ exists: false, has_password: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing env vars');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use GoTrue admin API to search users by email
    // Paginate through all users to find exact email match
    let found = false;
    let userId: string | null = null;
    let page = 1;
    const perPage = 500;

    while (true) {
      const res = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error('Admin API error:', res.status, errText);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await res.json();
      const users = data.users || [];

      for (const user of users) {
        if (user.email?.toLowerCase() === trimmedEmail) {
          found = true;
          userId = user.id;
          break;
        }
      }

      if (found || users.length < perPage) break;
      page++;
    }

    if (!found || !userId) {
      return new Response(JSON.stringify({ exists: false, has_password: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check profile for has_password
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('has_password')
      .eq('user_id', userId)
      .maybeSingle();

    return new Response(JSON.stringify({
      exists: true,
      has_password: profile?.has_password ?? false,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('check-has-password error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
