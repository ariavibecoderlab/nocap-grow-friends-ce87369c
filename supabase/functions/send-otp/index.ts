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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL');

    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');
    if (!SENDGRID_FROM_EMAIL) throw new Error('SENDGRID_FROM_EMAIL not configured');

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists before generating magic link (generateLink auto-creates users)
    const { data: lookupRes, error: lookupErr } = await supabase.auth.admin.getUserByEmail(email);
    if (lookupErr || !lookupRes?.user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a magic link — this returns the OTP token we can send via email
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (error) {
      console.error('Generate link error:', error.message);
      return new Response(JSON.stringify({ error: 'Failed to generate OTP' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const otp = data?.properties?.email_otp;
    if (!otp) {
      return new Response(JSON.stringify({ error: 'Failed to generate OTP' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send OTP via SendGrid
    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: SENDGRID_FROM_EMAIL, name: 'NOcap' },
        subject: 'Your NOcap Login Code',
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #2dac76; margin-bottom: 8px;">NOcap</h2>
              <p style="color: #333; margin-bottom: 16px;">Your login verification code is:</p>
              <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 16px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #222;">${otp}</span>
              </div>
              <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
            </div>
          `,
        }],
      }),
    });

    if (!sgResponse.ok) {
      const sgError = await sgResponse.text();
      console.error('SendGrid error:', sgError);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`OTP sent to ${email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Send OTP error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
