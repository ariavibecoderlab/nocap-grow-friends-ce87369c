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

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Use admin API to generate a link — this will fail with specific error if user doesn't exist
    // Instead, query auth.users via the admin listUsers with email filter
    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // listUsers doesn't support email filter in older SDK, so use a workaround:
    // Try to get user by sending an invite link (dry run) — or just query directly
    // Actually, the best approach: use the REST API directly to look up by email
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use the admin API endpoint to get user by email
    const lookupRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      }
    );

    // Better approach: use generateLink to check if user exists
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
    });

    if (linkError) {
      // If error contains "User not found", user doesn't exist
      if (linkError.message?.toLowerCase().includes('not found') || 
          linkError.message?.toLowerCase().includes('unable to find')) {
        return new Response(JSON.stringify({ exists: false, has_password: false }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Other error
      console.error('generateLink error:', linkError.message);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User exists — get their ID from the link data
    const userId = linkData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ exists: false, has_password: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check profile for has_password
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
