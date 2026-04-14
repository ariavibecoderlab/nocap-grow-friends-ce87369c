import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;

Deno.test("process-marketplace-order: missing auth returns 401", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/process-marketplace-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ store_id: "test", items: [] }),
  });
  const body = await res.text();
  assertEquals(res.status, 401);
  console.log("No auth response:", body);
});

Deno.test("process-marketplace-order: invalid auth returns 401", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/process-marketplace-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid-token",
    },
    body: JSON.stringify({ store_id: "test", items: [] }),
  });
  const body = await res.text();
  assertEquals(res.status, 401);
  console.log("Invalid auth response:", body);
});
