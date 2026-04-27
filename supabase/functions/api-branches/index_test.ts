import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
const API_BRANCHES_BASE_URL = Deno.env.get("API_BRANCHES_BASE_URL") || `${SUPABASE_URL}/functions/v1`;
const API_BRANCHES_TEST_KEY = Deno.env.get("API_BRANCHES_TEST_API_KEY");
const API_BRANCHES_TEST_SECRET = Deno.env.get("API_BRANCHES_TEST_API_SECRET");

const endpoint = `${API_BRANCHES_BASE_URL}/api-branches`;

Deno.test("api-branches: missing credentials still returns JSON error contract", async () => {
  assertExists(SUPABASE_URL, "VITE_SUPABASE_URL or SUPABASE_URL must be configured");

  const response = await fetch(endpoint, { method: "GET" });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  assertEquals(response.status, 401);
  assert(contentType.includes("application/json"), `Expected JSON content-type, got ${contentType}`);
  assert(!text.toLowerCase().includes("<!doctype html"), "API must not return marketing HTML");
  assertEquals(JSON.parse(text).error.includes("Missing API credentials"), true);
});

Deno.test("api-branches: valid x-api-key + x-api-secret returns backward-compatible branches JSON", async () => {
  assertExists(SUPABASE_URL, "VITE_SUPABASE_URL or SUPABASE_URL must be configured");

  if (!API_BRANCHES_TEST_KEY || !API_BRANCHES_TEST_SECRET) {
    console.log("Skipping valid credential contract test: set API_BRANCHES_TEST_API_KEY and API_BRANCHES_TEST_API_SECRET.");
    return;
  }

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "x-api-key": API_BRANCHES_TEST_KEY,
      "x-api-secret": API_BRANCHES_TEST_SECRET,
      "Accept": "application/json",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  assertEquals(response.status, 200, text);
  assert(contentType.includes("application/json"), `Expected JSON content-type, got ${contentType}`);
  assert(!text.toLowerCase().includes("<!doctype html"), "API must not return marketing HTML");

  const body = JSON.parse(text);
  assert(Array.isArray(body.branches), "branches must remain the canonical array");
  assert(Array.isArray(body.data), "data must remain an array alias for parser compatibility");
  assertEquals(body.data, body.branches, "data must mirror branches exactly");
  assertEquals(body.count, body.branches.length, "count must equal branches.length");

  for (const branch of body.branches) {
    assertEquals(typeof branch.id, "string", "branch.id must be a string");
    assertEquals(typeof branch.branch_name, "string", "branch.branch_name must be a string");
    assert("qr_code_id" in branch, "branch.qr_code_id must remain present");
    assertEquals(typeof branch.is_active, "boolean", "branch.is_active must be a boolean");
  }
});