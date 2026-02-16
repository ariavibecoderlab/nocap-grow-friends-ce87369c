import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Simple hash using Web Crypto API (SHA-256 + salt)
async function hashPin(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const pinSalt = salt || crypto.randomUUID();
  const data = new TextEncoder().encode(pin + pinSalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hash = encodeBase64(hashArray);
  return { hash, salt: pinSalt };
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  // storedHash format: "salt:hash"
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const { hash: computed } = await hashPin(pin, salt);
  return computed === hash;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Authenticate user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, current_pin, new_pin } = await req.json();

    // Get profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('pin_hash, has_pin, pin_attempts, pin_locked_until')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check lockout
    if (profile.pin_locked_until) {
      const lockedUntil = new Date(profile.pin_locked_until);
      if (lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        return new Response(JSON.stringify({ 
          error: `PIN locked. Try again in ${minutesLeft} minute(s).`,
          locked: true,
          locked_until: profile.pin_locked_until,
        }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Lockout expired, reset
      await adminClient.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', user.id);
      profile.pin_attempts = 0;
      profile.pin_locked_until = null;
    }

    if (action === 'set') {
      // Set new PIN (first time or after reset)
      if (!new_pin || new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
        return new Response(JSON.stringify({ error: 'PIN must be exactly 6 digits' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { hash, salt } = await hashPin(new_pin);
      const storedHash = `${salt}:${hash}`;

      await adminClient.from('profiles').update({
        pin_hash: storedHash,
        has_pin: true,
        pin_attempts: 0,
        pin_locked_until: null,
      }).eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'change') {
      // Change PIN — verify current first
      if (!profile.has_pin || !profile.pin_hash) {
        return new Response(JSON.stringify({ error: 'No PIN set' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!current_pin || !new_pin) {
        return new Response(JSON.stringify({ error: 'Current and new PIN required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isValid = await verifyPin(current_pin, profile.pin_hash);
      if (!isValid) {
        const newAttempts = (profile.pin_attempts || 0) + 1;
        const updates: any = { pin_attempts: newAttempts };
        if (newAttempts >= MAX_ATTEMPTS) {
          updates.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        }
        await adminClient.from('profiles').update(updates).eq('user_id', user.id);

        const remaining = MAX_ATTEMPTS - newAttempts;
        return new Response(JSON.stringify({ 
          error: remaining > 0 
            ? `Incorrect PIN. ${remaining} attempt(s) remaining.`
            : `Too many failed attempts. PIN locked for ${LOCKOUT_MINUTES} minutes.`,
          locked: newAttempts >= MAX_ATTEMPTS,
          attempts_remaining: Math.max(0, remaining),
        }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Valid current PIN — set new one
      if (new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
        return new Response(JSON.stringify({ error: 'New PIN must be exactly 6 digits' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { hash, salt } = await hashPin(new_pin);
      await adminClient.from('profiles').update({
        pin_hash: `${salt}:${hash}`,
        pin_attempts: 0,
        pin_locked_until: null,
      }).eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      // Verify PIN (used for transactions)
      if (!profile.has_pin || !profile.pin_hash) {
        return new Response(JSON.stringify({ error: 'No PIN set' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!current_pin) {
        return new Response(JSON.stringify({ error: 'PIN required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isValid = await verifyPin(current_pin, profile.pin_hash);
      if (!isValid) {
        const newAttempts = (profile.pin_attempts || 0) + 1;
        const updates: any = { pin_attempts: newAttempts };
        if (newAttempts >= MAX_ATTEMPTS) {
          updates.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        }
        await adminClient.from('profiles').update(updates).eq('user_id', user.id);

        const remaining = MAX_ATTEMPTS - newAttempts;
        return new Response(JSON.stringify({ 
          error: remaining > 0 
            ? `Incorrect PIN. ${remaining} attempt(s) remaining.`
            : `Too many failed attempts. PIN locked for ${LOCKOUT_MINUTES} minutes.`,
          locked: newAttempts >= MAX_ATTEMPTS,
          attempts_remaining: Math.max(0, remaining),
        }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Reset attempts on success
      await adminClient.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reset') {
      // Reset PIN (after OTP verification on client side — user is already authenticated via magic link)
      if (!new_pin || new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
        return new Response(JSON.stringify({ error: 'PIN must be exactly 6 digits' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { hash, salt } = await hashPin(new_pin);
      await adminClient.from('profiles').update({
        pin_hash: `${salt}:${hash}`,
        has_pin: true,
        pin_attempts: 0,
        pin_locked_until: null,
      }).eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Manage PIN error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
