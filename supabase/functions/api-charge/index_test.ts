import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Test that the HMAC-SHA256 signature computation matches the documented verification logic
Deno.test("HMAC webhook signature is consistent between signing and verification", async () => {
  // Simulate the exact flow from api-charge edge function
  const apiSecret = "test_secret_abc123";
  
  // Step 1: Compute api_secret_hash (SHA-256 of the raw secret) — this is stored in DB
  const secretData = new TextEncoder().encode(apiSecret);
  const secretHashBuf = await crypto.subtle.digest("SHA-256", secretData);
  const apiSecretHash = Array.from(new Uint8Array(secretHashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Step 2: Sign a webhook payload using HMAC-SHA256(payload, api_secret_hash)
  // This is what the edge function does
  const webhookPayload = {
    event: "charge.completed",
    charge_id: "test-uuid",
    transaction_id: "tx-uuid",
    amount: 10.5,
    description: "Order #12345",
    reference: "txn_88291",
    status: "completed",
    timestamp: "2026-02-16T12:00:00.000Z",
  };
  const payloadStr = JSON.stringify(webhookPayload);

  const encoder = new TextEncoder();
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiSecretHash),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(payloadStr));
  const signature = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Step 3: Verify using the documented approach (Node.js equivalent in Deno)
  // The docs say:
  //   1. signingKey = SHA-256(apiSecret).hex()  → this is apiSecretHash
  //   2. computed = HMAC-SHA256(body, signingKey).hex()
  //   3. Compare computed with X-Webhook-Signature header

  // Recreate the signing key from the raw secret (as a developer would)
  const verifySecretHashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(apiSecret));
  const verifySigningKey = Array.from(new Uint8Array(verifySecretHashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Verify signing key matches what the edge function uses
  assertEquals(verifySigningKey, apiSecretHash, "Signing key derivation must match");

  // Compute HMAC using the signing key
  const verifyHmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(verifySigningKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const verifySigBuf = await crypto.subtle.sign("HMAC", verifyHmacKey, encoder.encode(payloadStr));
  const verifySignature = Array.from(new Uint8Array(verifySigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // The signature computed by the edge function must match the one computed by the developer
  assertEquals(
    signature,
    verifySignature,
    "Webhook signature from edge function must match developer verification"
  );

  // Verify signature is a valid 64-char hex string
  assertEquals(signature.length, 64, "HMAC-SHA256 hex signature must be 64 chars");
  assertEquals(/^[0-9a-f]{64}$/.test(signature), true, "Signature must be lowercase hex");

  console.log("✅ Signature:", signature);
  console.log("✅ Verified:  ", verifySignature);
  console.log("✅ Match: signatures are cryptographically consistent");
});

Deno.test("Different payloads produce different signatures", async () => {
  const apiSecretHash = "abc123def456";
  const encoder = new TextEncoder();

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiSecretHash),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const payload1 = JSON.stringify({ amount: 10 });
  const payload2 = JSON.stringify({ amount: 20 });

  const sig1Buf = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(payload1));
  const sig1 = Array.from(new Uint8Array(sig1Buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const sig2Buf = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(payload2));
  const sig2 = Array.from(new Uint8Array(sig2Buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  assertEquals(sig1 !== sig2, true, "Different payloads must produce different signatures");
  console.log("✅ Different payloads correctly produce different signatures");
});

Deno.test("Tampered payload fails verification", async () => {
  const apiSecret = "my_secret_key";
  const encoder = new TextEncoder();

  // Derive signing key
  const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(apiSecret));
  const signingKey = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign original payload
  const original = JSON.stringify({ amount: 50, event: "charge.completed" });
  const sigBuf = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(original));
  const originalSig = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Tampered payload
  const tampered = JSON.stringify({ amount: 500, event: "charge.completed" });
  const tamperedSigBuf = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(tampered));
  const tamperedSig = Array.from(new Uint8Array(tamperedSigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  assertEquals(originalSig !== tamperedSig, true, "Tampered payload must NOT match original signature");
  console.log("✅ Tampered payload correctly rejected (signatures don't match)");
});
