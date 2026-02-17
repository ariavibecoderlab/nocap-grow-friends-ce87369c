import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: 'Email and OTP are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find profile by email via auth user
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (listErr || !authUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get stored OTP hash
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('reset_otp_hash, reset_otp_expires_at')
      .eq('user_id', authUser.id)
      .single();

    if (profileErr || !profile?.reset_otp_hash || !profile?.reset_otp_expires_at) {
      return new Response(JSON.stringify({ error: 'No OTP request found. Please request a new code.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(profile.reset_otp_expires_at) < new Date()) {
      // Clear expired OTP
      await supabase.from('profiles').update({ reset_otp_hash: null, reset_otp_expires_at: null }).eq('user_id', authUser.id);
      return new Response(JSON.stringify({ error: 'Code expired. Please request a new one.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify OTP
    const inputHash = await hashOtp(otp);
    if (inputHash !== profile.reset_otp_hash) {
      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OTP verified — clear it and return a short-lived verification token
    // We'll use a simple signed token: hash(user_id + secret + timestamp)
    const verifiedAt = Date.now().toString();
    const verificationData = `${authUser.id}:${verifiedAt}:${SUPABASE_SERVICE_ROLE_KEY}`;
    const encoder = new TextEncoder();
    const verificationHash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verificationData)))
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    // Clear OTP from profile
    await supabase.from('profiles').update({ reset_otp_hash: null, reset_otp_expires_at: null }).eq('user_id', authUser.id);

    console.log(`OTP verified for ${email}`);

    return new Response(JSON.stringify({
      success: true,
      verification_token: `${authUser.id}:${verifiedAt}:${verificationHash}`,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
