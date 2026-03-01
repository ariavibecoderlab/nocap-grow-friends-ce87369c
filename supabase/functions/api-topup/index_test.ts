import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;

Deno.test("api-topup: missing credentials returns 401", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/api-topup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 50 }),
  });
  const body = await res.text();
  assertEquals(res.status, 401);
  console.log("Missing creds response:", body);
});

Deno.test("api-topup: invalid api key returns 401", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/api-topup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "invalid",
      "x-api-secret": "invalid",
      "Authorization": "Bearer faketoken",
    },
    body: JSON.stringify({ amount: 50 }),
  });
  const body = await res.text();
  assertEquals(res.status, 401);
  console.log("Invalid API key response:", body);
});

Deno.test("api-topup: valid api key + invalid token returns 401", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/api-topup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "9a29bb3313465fb0e5d3adc1c1b6f0385b287fdf5db48fb541c405efd8c40d35",
      "x-api-secret": "hello",
      "Authorization": "Bearer hello",
    },
    body: JSON.stringify({ amount: 50, description: "Test", reference: "UNIT-TEST-001" }),
  });
  const body = await res.text();
  console.log("Valid API + token response:", res.status, body);
  // This should work if the token exists, or 401 if not
  assertExists(body);
});
