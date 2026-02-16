import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const ApiDocs = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Code className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Developer Documentation</h1>
            <p className="text-muted-foreground">Integrate NoCap Wallet into your third-party application.</p>
          </div>
        </div>

        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="authentication">Auth Flow</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="errors">Error Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>Follow these steps to begin integrating our wallet system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">1. Register your App</h3>
                  <p className="text-sm text-muted-foreground">
                    Merchants can register third-party applications through the Merchant Dashboard under the "API" tab. 
                    You will receive an <strong>API Key</strong> and an <strong>API Secret</strong>. Store the secret securely; it will only be shown once.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">2. User Authorization</h3>
                  <p className="text-sm text-muted-foreground">
                    To access a user's wallet, you must obtain an authorization token. Redirect users to our authorization flow 
                    where they can grant permission to your application.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">3. Base URL</h3>
                  <p className="text-sm text-muted-foreground">All API requests should be made to our edge functions endpoint:</p>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
                    https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authentication">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication Overview</CardTitle>
                  <CardDescription>How to authenticate your requests and obtain user access tokens.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    API requests require different headers depending on the endpoint. Most endpoints need all three:
                  </p>
                  <div className="p-4 bg-muted rounded-md space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><span className="font-mono font-bold text-primary">X-Api-Key</span></div>
                      <div className="text-muted-foreground">Your application's unique public key.</div>
                      <div><span className="font-mono font-bold text-primary">X-Api-Secret</span></div>
                      <div className="text-muted-foreground">Your application's private secret key.</div>
                      <div><span className="font-mono font-bold text-primary">Authorization</span></div>
                      <div className="text-muted-foreground">Bearer &lt;user_access_token&gt; (for user-scoped endpoints)</div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-4 rounded-md">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Security Note:</strong> Never expose your API Secret in client-side code. All calls using the secret should be made from your server.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-authorize</CardTitle>
                  </div>
                  <CardDescription>Obtain a user access token. The user must be logged in and call this endpoint directly to grant your app permission.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Headers:</h4>
                    <p className="text-sm text-muted-foreground">Only the user's <code className="text-primary font-bold">Authorization</code> (Supabase session token) is required. No API Key/Secret needed.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">app_id</code> (string, required): Your application ID.</li>
                      <li><code className="text-primary font-bold">scopes</code> (string[], optional): Permissions to request. Default: <code>["balance", "charge"]</code>.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-authorize" \\
  -H "Authorization: Bearer user_supabase_session_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "app_id": "uuid-of-your-app",
    "scopes": ["balance", "charge"]
  }'`}
                  </pre>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "access_token": "a1b2c3d4e5f6...64_hex_chars",
  "app_name": "My POS App",
  "scopes": ["balance", "charge"]
}`}
                  </pre>
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
                    <p className="text-xs text-destructive">
                      <strong>⚠️ Important:</strong> The <code>access_token</code> is shown only once. Store it securely on your server. This token is used as the <code>Authorization: Bearer</code> header for all subsequent API calls.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-revoke</CardTitle>
                  </div>
                  <CardDescription>Revoke a user's access token, disconnecting your app from their wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Headers:</h4>
                    <p className="text-sm text-muted-foreground">The user's <code className="text-primary font-bold">Authorization</code> (Supabase session token). No API Key/Secret needed.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">token_id</code> (string, required): The ID of the access token to revoke.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-revoke" \\
  -H "Authorization: Bearer user_supabase_session_token" \\
  -H "Content-Type: application/json" \\
  -d '{ "token_id": "uuid-of-the-token" }'`}
                  </pre>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{ "success": true }`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="endpoints">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-balance</CardTitle>
                  </div>
                  <CardDescription>Retrieve the authenticated user's current wallet balance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-balance" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"`}
                  </pre>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "balance": 150.75,
  "currency": "MYR"
}`}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-charge</CardTitle>
                  </div>
                  <CardDescription>Initiate a payment from the user's wallet to your merchant branch.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">amount</code> (number, required): The payment amount.</li>
                      <li><code className="text-primary font-bold">description</code> (string, optional): A brief description of the charge.</li>
                      <li><code className="text-primary font-bold">reference</code> (string, optional): Your internal transaction reference ID.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10.50,
    "description": "Order #12345",
    "reference": "txn_88291"
  }'`}
                  </pre>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.50,
  "new_balance": 140.25,
  "cashback": 0.09,
  "branch_name": "My Store"
}`}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-charge-status</CardTitle>
                  </div>
                  <CardDescription>Check the status of a specific charge request.</CardDescription>
                </CardHeader>
                <CardContent>
                  <h4 className="text-sm font-semibold mb-2">Query Parameters:</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <code className="text-primary font-bold">charge_id</code> (string, required): The ID of the charge returned by the /api-charge endpoint.
                  </p>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge-status?charge_id=uuid" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}
                  </pre>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "completed",
  "transaction_id": "uuid",
  "created_at": "2026-02-16T12:00:00.000Z",
  "completed_at": "2026-02-16T12:00:01.000Z"
}`}
                  </pre>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs font-bold rounded">POST</span>
                    <CardTitle className="text-lg">/api-refund</CardTitle>
                  </div>
                  <CardDescription>Issue a full or partial refund for a completed charge. Funds are returned from the branch wallet to the member's wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Headers:</h4>
                    <p className="text-sm text-muted-foreground">Only <code className="text-primary font-bold">X-Api-Key</code> and <code className="text-primary font-bold">X-Api-Secret</code> are required. No user access token needed — the merchant initiates refunds.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">charge_id</code> (string, required): The charge ID to refund.</li>
                      <li><code className="text-primary font-bold">amount</code> (number, optional): Partial refund amount. Omit for full refund.</li>
                      <li><code className="text-primary font-bold">reason</code> (string, optional): Reason for the refund.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold mb-2">Request Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-refund" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -d '{
    "charge_id": "uuid-of-the-charge",
    "amount": 5.00,
    "reason": "Customer returned item"
  }'`}
                  </pre>
                  <h4 className="text-sm font-semibold mb-2">Response Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.50,
  "status": "partial_refund",
  "transaction_id": "uuid"
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="webhooks">
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>Receive real-time notifications for payment events at your configured webhook URL.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Setup</h3>
                  <p className="text-sm text-muted-foreground">
                    Set a <strong>Webhook URL</strong> when registering your API application in the Merchant Dashboard.
                    We will send a <code className="text-primary font-bold">POST</code> request with a JSON payload to this URL whenever a payment event occurs.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Events</h3>
                  <div className="p-4 bg-muted rounded-md space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <code className="text-primary font-bold whitespace-nowrap">charge.completed</code>
                      <span className="text-muted-foreground">Sent when a charge is successfully processed.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <code className="text-primary font-bold whitespace-nowrap">charge.partial_refund</code>
                      <span className="text-muted-foreground">Sent when a partial refund is issued for a charge.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <code className="text-primary font-bold whitespace-nowrap">charge.refunded</code>
                      <span className="text-muted-foreground">Sent when a charge is fully refunded.</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Payload Format</h3>
                  <h4 className="text-sm font-semibold">charge.completed</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "event": "charge.completed",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "completed",
  "timestamp": "2026-02-16T12:00:00.000Z"
}`}
                  </pre>
                  <h4 className="text-sm font-semibold mt-3">charge.partial_refund / charge.refunded</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "event": "charge.partial_refund",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.50,
  "reason": "Customer returned item",
  "status": "partial_refund",
  "timestamp": "2026-02-16T12:30:00.000Z"
}`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Signature Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    Every webhook request includes an <code className="text-primary font-bold">X-Webhook-Signature</code> header containing an HMAC-SHA256 signature of the request body.
                    You should verify this signature to ensure the webhook is authentic and hasn't been tampered with.
                  </p>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">How it works:</h4>
                    <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                      <li>Compute <code className="text-primary">SHA-256</code> of your <strong>API Secret</strong> to get the signing key.</li>
                      <li>Compute <code className="text-primary">HMAC-SHA256(request_body, signing_key)</code>.</li>
                      <li>Compare the result (hex) with the <code className="text-primary">X-Webhook-Signature</code> header.</li>
                    </ol>
                  </div>
                  <h4 className="text-sm font-semibold mt-3">Node.js Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`const crypto = require('crypto');

function verifyWebhook(body, signature, apiSecret) {
  // Step 1: SHA-256 hash of your API secret = signing key
  const signingKey = crypto
    .createHash('sha256')
    .update(apiSecret)
    .digest('hex');

  // Step 2: HMAC-SHA256 of the raw body using the signing key
  const computed = crypto
    .createHmac('sha256', signingKey)
    .update(body) // raw request body string
    .digest('hex');

  // Step 3: Compare
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// Express middleware example
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = JSON.stringify(req.body);

  if (!verifyWebhook(rawBody, signature, YOUR_API_SECRET)) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  // Process the webhook event
  console.log('Verified event:', req.body.event);
  res.status(200).json({ received: true });
});`}
                  </pre>
                  <h4 className="text-sm font-semibold mt-3">Python Example:</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`import hashlib, hmac

def verify_webhook(body: str, signature: str, api_secret: str) -> bool:
    signing_key = hashlib.sha256(api_secret.encode()).hexdigest()
    computed = hmac.new(
        signing_key.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)`}
                  </pre>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-4 rounded-md">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Webhook delivery is best-effort. Your endpoint should respond with a 2xx status code within 5 seconds. 
                    Failed deliveries are not retried. Always use the <code>/api-charge-status</code> endpoint as the source of truth for charge status.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Error Codes Reference</CardTitle>
                <CardDescription>Standard error responses returned by the API. All errors follow the format: <code className="text-primary">{`{ "error": "message" }`}</code></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold">HTTP</th>
                        <th className="text-left py-2 pr-4 font-semibold">Error</th>
                        <th className="text-left py-2 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">401</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Missing API credentials</td>
                        <td className="py-2">X-Api-Key or X-Api-Secret header is missing.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">401</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Invalid API credentials</td>
                        <td className="py-2">API Key not found, app inactive, or secret doesn't match.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">401</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Missing access token</td>
                        <td className="py-2">Authorization Bearer header is missing (for user-scoped endpoints).</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">401</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Invalid or expired access token</td>
                        <td className="py-2">The user access token is invalid, revoked, or has expired.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">403</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Insufficient scope</td>
                        <td className="py-2">Token doesn't have the required scope (e.g., "charge" or "balance").</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Amount must be between 0.01 and 50000</td>
                        <td className="py-2">Charge amount is out of the allowed range.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Insufficient balance</td>
                        <td className="py-2">User's wallet doesn't have enough funds for the charge.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">PIN_REQUIRED</td>
                        <td className="py-2">Transaction requires PIN verification. Include <code className="text-primary">pin</code> in request body.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">PIN_NOT_SET</td>
                        <td className="py-2">User hasn't set a PIN yet. They must set one in the app first.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">403</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Invalid PIN</td>
                        <td className="py-2">The PIN provided is incorrect.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Cannot pay to your own branch</td>
                        <td className="py-2">Merchant cannot charge their own wallet.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Only completed charges can be refunded</td>
                        <td className="py-2">Refund attempted on a pending or failed charge.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Charge already fully refunded</td>
                        <td className="py-2">Total refunded amount has already reached the original charge amount.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">400</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Insufficient branch balance for refund</td>
                        <td className="py-2">Branch wallet doesn't have enough funds to process the refund.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">404</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Charge not found</td>
                        <td className="py-2">The charge_id doesn't exist or doesn't belong to your app.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><code className="text-primary">409</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Already authorized for this app</td>
                        <td className="py-2">User has already granted access to this app. Revoke first to re-authorize.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 bg-muted p-4 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Some charge errors include an additional <code className="text-primary">charge_id</code> field and a <code className="text-primary">code</code> field (e.g., <code>"code": "PIN_REQUIRED"</code>) for programmatic handling.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default ApiDocs;
