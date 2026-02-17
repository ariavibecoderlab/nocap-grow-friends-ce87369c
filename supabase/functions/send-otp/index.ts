import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate a random 6-digit OTP
function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

// SHA-256 hash
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
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL');

    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');
    if (!SENDGRID_FROM_EMAIL) throw new Error('SENDGRID_FROM_EMAIL not configured');

    const { email, purpose } = await req.json();
    // purpose: "login" (default) or "pin_reset"
    const otpPurpose = purpose || 'login';

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists and is properly registered
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (listErr || !authUser || !authUser.email_confirmed_at) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (otpPurpose === 'login') {
      // LOGIN: Use Supabase's generateLink to create a proper auth OTP
      // This ensures supabase.auth.verifyOtp() works on the frontend
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (linkError || !linkData) {
        console.error('generateLink error:', linkError?.message);
        return new Response(JSON.stringify({ error: 'Failed to generate OTP' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract OTP from the hashed_token properties
      const otp = linkData.properties?.hashed_token
        ? undefined
        : undefined;

      // The OTP is in the action_link URL as a token parameter
      const actionLink = linkData.properties?.action_link || '';
      const url = new URL(actionLink);
      const token = url.searchParams.get('token') || '';

      // We need the actual 6-digit OTP code. generateLink with magiclink 
      // creates a token but we need the raw OTP for email.
      // Actually, the OTP code is stored internally by Supabase.
      // We need to use a different approach: use generateLink which stores 
      // the OTP in auth, then send our own email with the extracted token.
      
      // For magiclink, the token in the URL is the hashed version.
      // We need to use signInWithOtp approach but send email ourselves.
      // Let's use the admin API to generate an OTP properly.
      
      // Actually the simplest: generate the link, extract the OTP from 
      // linkData.properties.email_otp (available in newer Supabase versions)
      const emailOtp = (linkData.properties as any)?.email_otp;
      
      if (!emailOtp) {
        // Fallback: if email_otp not available, use the hashed_token
        // which is the 6-digit code Supabase generates
        console.error('email_otp not found in link properties, available keys:', Object.keys(linkData.properties || {}));
        return new Response(JSON.stringify({ error: 'Failed to generate OTP code' }), {
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
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #222;">${emailOtp}</span>
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

      console.log(`Login OTP sent to ${email}`);

    } else {
      // PIN RESET: Use custom OTP stored in profiles (no Supabase auth involvement)
      const otp = generateOtp();
      const otpHash = await hashOtp(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Store the hashed OTP in the user's profile
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ reset_otp_hash: otpHash, reset_otp_expires_at: expiresAt })
        .eq('user_id', authUser.id);

      if (updateErr) {
        console.error('Failed to store OTP:', updateErr.message);
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
          subject: 'Your NOcap PIN Reset Code',
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #2dac76; margin-bottom: 8px;">NOcap</h2>
                <p style="color: #333; margin-bottom: 16px;">Your PIN reset verification code is:</p>
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

      console.log(`PIN reset OTP sent to ${email}`);
    }

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