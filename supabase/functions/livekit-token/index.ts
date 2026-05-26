// LiveKit access-token generator.
// POST { roomName, role: "host"|"viewer", displayName? }
// Returns { token, livekitUrl }
//
// Secrets required in Supabase project:
//   LIVEKIT_API_KEY   — from your LiveKit Cloud project
//   LIVEKIT_API_SECRET
//   LIVEKIT_URL       — wss://your-project.livekit.cloud  (optional, has default)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------- minimal JWT HS-256 in Web Crypto ----------
function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signToken(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const body = b64url(payload);
  const msg = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(msg)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${msg}.${sigB64}`;
}

async function makeToken(opts: {
  apiKey: string;
  apiSecret: string;
  roomName: string;
  identity: string;
  name: string;
  canPublish: boolean;
  ttlSeconds: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signToken(
    {
      iss: opts.apiKey,
      sub: opts.identity,
      jti: crypto.randomUUID(),
      name: opts.name,
      nbf: now - 1,
      exp: now + opts.ttlSeconds,
      video: {
        room: opts.roomName,
        roomJoin: true,
        canPublish: opts.canPublish,
        canSubscribe: true,
        canPublishData: true,
      },
    },
    opts.apiSecret
  );
}
// ------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a valid Supabase user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const roomName: string = body.roomName;
    const role: "host" | "viewer" = body.role ?? "viewer";
    const displayName: string = body.displayName ?? user.email ?? "Guest";

    if (!roomName) {
      return new Response(JSON.stringify({ error: "roomName is required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl =
      Deno.env.get("LIVEKIT_URL") ?? "wss://nocap.livekit.cloud";

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "LiveKit credentials not configured" }),
        {
          status: 503,
          headers: { ...CORS, "Content-Type": "application/json" },
        }
      );
    }

    const token = await makeToken({
      apiKey,
      apiSecret,
      roomName,
      identity: user.id,
      name: displayName,
      canPublish: role === "host",
      ttlSeconds: role === "host" ? 14_400 : 7_200, // 4h host / 2h viewer
    });

    return new Response(JSON.stringify({ token, livekitUrl }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
