import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CodeBlock from "@/components/CodeBlock";
import ApiTryIt from "@/components/ApiTryIt";
import { ApiCredentialsProvider } from "@/contexts/ApiCredentialsContext";

const ApiDocs = () => {
  return (
    <ApiCredentialsProvider>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="authentication">Auth Flow</TabsTrigger>
            <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="errors">Error Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" forceMount className="data-[state=inactive]:hidden">
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
                  <h3 className="font-semibold text-lg">3. Sandbox Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable <strong>Sandbox Mode</strong> when creating an API app to test integrations without using real money. 
                    Sandbox transactions are immediately marked as completed and do not deduct from wallets.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-4 rounded-md space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">🧪 Test Access Token</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      When you create a sandbox app, a <strong>Test Access Token</strong> is automatically generated and shown in the credentials dialog. 
                      This token lets you skip the user authorization flow entirely — use it as the <code className="font-mono font-bold">Authorization: Bearer</code> header 
                      in place of a real user token.
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Need more tokens? Click <strong>"Generate Test Token"</strong> on any sandbox app in the Merchant Dashboard to create additional ones.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">4. Base URL</h3>
                  <p className="text-sm text-muted-foreground">All API requests should be made to our edge functions endpoint:</p>
                  <CodeBlock>{`https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/`}</CodeBlock>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">5. Rate Limits</h3>
                  <p className="text-sm text-muted-foreground">
                    All API endpoints are rate limited per API key. Exceeding the limit returns a <code className="text-primary font-bold">429 Too Many Requests</code> response with a <code className="text-primary font-bold">Retry-After</code> header.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-semibold">Endpoint</th>
                          <th className="text-left py-2 font-semibold">Limit</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-authorize</td>
                          <td className="py-2">10 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-charge</td>
                          <td className="py-2">30 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-refund</td>
                          <td className="py-2">20 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-balance</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-charge-status</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">/api-charges-list</td>
                          <td className="py-2">60 req/min</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authentication" forceMount className="data-[state=inactive]:hidden">
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
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-authorize" \\
  -H "Authorization: Bearer user_supabase_session_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "app_id": "uuid-of-your-app",
    "scopes": ["balance", "charge"]
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "success": true,
  "access_token": "a1b2c3d4e5f6...64_hex_chars",
  "app_name": "My POS App",
  "scopes": ["balance", "charge"]
}`}</CodeBlock>
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
                    <p className="text-xs text-destructive">
                      <strong>⚠️ Important:</strong> The <code>access_token</code> is shown only once. Store it securely on your server. This token is used as the <code>Authorization: Bearer</code> header for all subsequent API calls.
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-4 rounded-md space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">🧪 Sandbox Shortcut: Skip This Step</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      If your app is in <strong>Sandbox Mode</strong>, you don't need to call <code className="font-mono">/api-authorize</code>. 
                      A test access token is auto-generated when you create the app. Use it directly:
                    </p>
                    <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer your_test_access_token" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 1.00, "description": "Test charge" }'`}</CodeBlock>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      You can generate additional test tokens anytime from the Merchant Dashboard → API tab → <strong>"Generate Test Token"</strong>.
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
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-revoke" \\
  -H "Authorization: Bearer user_supabase_session_token" \\
  -H "Content-Type: application/json" \\
  -d '{ "token_id": "uuid-of-the-token" }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{ "success": true }`}</CodeBlock>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sandbox" forceMount className="data-[state=inactive]:hidden">
            <div className="space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Sandbox Testing Guide</CardTitle>
                  <CardDescription>A complete end-to-end walkthrough for testing your integration without real money.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Sandbox mode lets you build and test your entire payment integration in a safe environment. 
                    Transactions are simulated — no real funds move, charges complete instantly, and you get realistic API responses.
                  </p>
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-md">
                    <p className="text-xs text-primary font-semibold mb-1">✅ What's different in Sandbox?</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Charges are marked <strong>completed</strong> immediately (no pending state)</li>
                      <li>No wallet balance is deducted from users</li>
                      <li>Webhooks still fire with realistic payloads</li>
                      <li>A <strong>Test Access Token</strong> is auto-generated — no need to run the OAuth flow</li>
                      <li>All sandbox charges are flagged with <code className="font-mono text-primary">is_sandbox: true</code></li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Step 1 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 1 — Create a Sandbox App</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-2">
                    <li>Go to the <strong>Merchant Dashboard → API</strong> tab.</li>
                    <li>Click <strong>"Register New App"</strong>.</li>
                    <li>Toggle <strong>Sandbox Mode</strong> on.</li>
                    <li>Fill in the app name and optional description, then submit.</li>
                  </ol>
                  <p className="text-sm text-muted-foreground">
                    After creation you'll see a credentials dialog with your <strong>API Key</strong>, <strong>API Secret</strong>, and a <strong>Test Access Token</strong>. 
                    Copy all three — the secret is only shown once.
                  </p>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 2 — Set Your Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Store the credentials in your server environment. Here's an example using shell variables:
                  </p>
                  <CodeBlock>{`export API_KEY="your_api_key"
export API_SECRET="your_api_secret"
export TEST_TOKEN="your_test_access_token"`}</CodeBlock>
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 rounded-md">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      💡 <strong>Tip:</strong> Need another token? Click <strong>"Generate Test Token"</strong> on the sandbox app card anytime.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 3 — Check Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Verify your credentials work by fetching the test user's balance:
                  </p>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-balance" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET" \\
  -H "Authorization: Bearer $TEST_TOKEN"`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Expected response:</p>
                  <CodeBlock>{`{
  "balance": 150.75,
  "currency": "MYR"
}`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 4 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 4 — Create a Test Charge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Create a charge. In sandbox mode it completes instantly:
                  </p>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET" \\
  -H "Authorization: Bearer $TEST_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5.00,
    "description": "Test order #1",
    "reference": "order_001",
    "metadata": { "item": "Widget", "qty": 2 }
  }'`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Expected response:</p>
                  <CodeBlock>{`{
  "success": true,
  "charge_id": "uuid-of-the-charge",
  "status": "completed",
  "is_sandbox": true
}`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 5 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 5 — Query Charge Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Verify the charge was recorded by querying its status:
                  </p>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge-status?charge_id=uuid-of-the-charge" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET"`}</CodeBlock>
                  <p className="text-xs text-muted-foreground">Expected response:</p>
                  <CodeBlock>{`{
  "charge_id": "uuid-of-the-charge",
  "amount": 5.00,
  "status": "completed",
  "is_sandbox": true,
  "reference": "order_001",
  "description": "Test order #1",
  "metadata": { "item": "Widget", "qty": 2 },
  "created_at": "2026-02-16T10:00:00Z",
  "completed_at": "2026-02-16T10:00:00Z"
}`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 6 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 6 — Test a Refund</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Issue a full or partial refund against the test charge:
                  </p>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-refund" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "charge_id": "uuid-of-the-charge",
    "amount": 2.50,
    "reason": "Partial refund test"
  }'`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 7 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 7 — List All Charges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Retrieve a paginated list of all sandbox charges to verify your test data:
                  </p>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charges-list?limit=10&status=completed" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET"`}</CodeBlock>
                </CardContent>
              </Card>

              {/* Step 8 — Webhook Testing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 8 — Test Webhooks</CardTitle>
                  <CardDescription>Verify your server receives payment notifications correctly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">8a. Set your webhook URL</h4>
                    <p className="text-sm text-muted-foreground">
                      When registering or editing your sandbox app, set the <strong>Webhook URL</strong> field to your server endpoint. 
                      For local development, use a tunnel service like <strong>ngrok</strong> or <strong>localtunnel</strong>:
                    </p>
                    <CodeBlock>{`# Start a tunnel to your local server
ngrok http 3000

# Copy the HTTPS URL, e.g. https://abc123.ngrok.io
# Set it as your webhook URL in the Merchant Dashboard → API tab`}</CodeBlock>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">8b. Create a webhook handler</h4>
                    <p className="text-sm text-muted-foreground">
                      Your endpoint should accept POST requests and return a <code className="font-mono text-primary">200</code> status. Here's a minimal Node.js example:
                    </p>
                    <CodeBlock>{`// Express webhook handler
app.post("/webhook/nocap", (req, res) => {
  const event = req.body;

  console.log("Webhook received:", event.type);
  console.log("Charge ID:", event.charge_id);
  console.log("Amount:", event.amount);
  console.log("Status:", event.status);
  console.log("Sandbox:", event.is_sandbox);

  // TODO: Update your order status in your database

  res.status(200).json({ received: true });
});`}</CodeBlock>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">8c. Trigger a webhook</h4>
                    <p className="text-sm text-muted-foreground">
                      Create a sandbox charge (Step 4) — it completes instantly and fires a webhook to your URL:
                    </p>
                    <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: $API_KEY" \\
  -H "X-Api-Secret: $API_SECRET" \\
  -H "Authorization: Bearer $TEST_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 3.00, "description": "Webhook test", "reference": "wh_test_001" }'`}</CodeBlock>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">8d. Expected webhook payload</h4>
                    <p className="text-sm text-muted-foreground">
                      Your endpoint will receive a POST request with the following JSON body:
                    </p>
                    <CodeBlock>{`{
  "type": "charge.completed",
  "charge_id": "uuid-of-the-charge",
  "app_id": "uuid-of-your-app",
  "amount": 3.00,
  "status": "completed",
  "is_sandbox": true,
  "reference": "wh_test_001",
  "description": "Webhook test",
  "metadata": null,
  "transaction_id": "uuid-of-the-transaction",
  "completed_at": "2026-02-16T10:00:00Z"
}`}</CodeBlock>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-md">
                    <p className="text-xs text-primary font-semibold mb-1">💡 Debugging Tips</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Check your tunnel dashboard (e.g. <code className="font-mono">http://localhost:4040</code> for ngrok) to inspect raw requests</li>
                      <li>If your endpoint returns a non-200 status, the webhook will <strong>not</strong> retry in sandbox mode</li>
                      <li>Verify your server logs show the payload — if not, check the webhook URL is correct in your app settings</li>
                      <li>Sandbox webhooks have <code className="font-mono text-primary">is_sandbox: true</code> — use this flag to skip real order processing</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Going Live */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Going Live 🚀</CardTitle>
                  <CardDescription>When you're ready to accept real payments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-2">
                    <li>Create a <strong>new API app</strong> with Sandbox Mode <strong>off</strong>.</li>
                    <li>Replace your sandbox credentials with the new production <strong>API Key</strong> and <strong>API Secret</strong>.</li>
                    <li>Implement the <strong>OAuth authorization flow</strong> (<code className="font-mono text-primary">/api-authorize</code>) to obtain real user tokens — test tokens won't work in production.</li>
                    <li>Set up your <strong>webhook endpoint</strong> to receive payment notifications.</li>
                    <li>Test with a small real charge, then scale up.</li>
                  </ol>
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
                    <p className="text-xs text-destructive">
                      <strong>⚠️ Important:</strong> Production charges deduct real funds from user wallets. Double-check your amount calculations before going live.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="endpoints" forceMount className="data-[state=inactive]:hidden">
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
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-balance" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "balance": 150.75,
  "currency": "MYR"
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-balance"
                    params={[]}
                    needsUserToken={true}
                  />
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
                      <li><code className="text-primary font-bold">metadata</code> (object, optional): Custom key-value data (max 4KB). Returned in webhooks and charge queries.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10.50,
    "description": "Order #12345",
    "reference": "txn_88291",
    "metadata": { "order_id": "ORD-123", "customer_email": "user@example.com" }
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "success": true,
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.50,
  "new_balance": 140.25,
  "cashback": 0.09,
  "branch_name": "My Store"
}`}</CodeBlock>
                  <ApiTryIt
                    method="POST"
                    endpoint="api-charge"
                    params={[]}
                    bodyFields={[
                      { name: "amount", placeholder: "10.50", type: "number", required: true },
                      { name: "description", placeholder: "Order #12345", type: "string" },
                      { name: "reference", placeholder: "txn_88291", type: "string" },
                      { name: "metadata", placeholder: '{ "order_id": "ORD-123" }', type: "json" },
                    ]}
                    needsUserToken={true}
                  />
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
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-semibold mb-2">Query Parameters:</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <code className="text-primary font-bold">charge_id</code> (string, required): The ID of the charge returned by the /api-charge endpoint.
                  </p>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge-status?charge_id=uuid" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "completed",
  "transaction_id": "uuid",
  "created_at": "2026-02-16T12:00:00.000Z",
  "completed_at": "2026-02-16T12:00:01.000Z"
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-charge-status"
                    params={[
                      { name: "charge_id", placeholder: "uuid-of-the-charge", required: true, type: "query" },
                    ]}
                    needsUserToken={false}
                  />
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
                  <CodeBlock>{`curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-refund" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -d '{
    "charge_id": "uuid-of-the-charge",
    "amount": 5.00,
    "reason": "Customer returned item"
  }'`}</CodeBlock>
                  <h4 className="text-sm font-semibold mb-2">Response Example:</h4>
                  <CodeBlock>{`{
  "success": true,
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.50,
  "status": "partial_refund",
  "transaction_id": "uuid"
}`}</CodeBlock>
                  <ApiTryIt
                    method="POST"
                    endpoint="api-refund"
                    params={[]}
                    bodyFields={[
                      { name: "charge_id", placeholder: "uuid-of-the-charge", type: "string", required: true },
                      { name: "amount", placeholder: "5.00", type: "number" },
                      { name: "reason", placeholder: "Customer returned item", type: "string" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-bold rounded">GET</span>
                    <CardTitle className="text-lg">/api-charges-list</CardTitle>
                  </div>
                  <CardDescription>Retrieve a paginated list of charges for your API app with optional filters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Query Parameters:</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li><code className="text-primary font-bold">page</code> (number, optional): Page number. Default: 1.</li>
                      <li><code className="text-primary font-bold">limit</code> (number, optional): Items per page (1–100). Default: 20.</li>
                      <li><code className="text-primary font-bold">status</code> (string, optional): Filter by status (pending, completed, failed, refunded, partial_refund).</li>
                      <li><code className="text-primary font-bold">from</code> (string, optional): ISO 8601 date. Only charges created on or after this date.</li>
                      <li><code className="text-primary font-bold">to</code> (string, optional): ISO 8601 date. Only charges created on or before this date.</li>
                      <li><code className="text-primary font-bold">reference</code> (string, optional): Filter by your internal reference ID.</li>
                      <li><code className="text-primary font-bold">user_id</code> (string, optional): Filter by a specific user's charges.</li>
                    </ul>
                  </div>
                  <h4 className="text-sm font-semibold">Request Example:</h4>
                  <CodeBlock>{`curl -X GET "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charges-list?page=1&limit=10&status=completed" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"`}</CodeBlock>
                  <h4 className="text-sm font-semibold">Response Example:</h4>
                  <CodeBlock>{`{
  "data": [
    {
      "id": "uuid",
      "amount": 10.50,
      "description": "Order #12345",
      "reference": "txn_88291",
      "status": "completed",
      "is_sandbox": false,
      "transaction_id": "uuid",
      "user_id": "uuid",
      "created_at": "2026-02-16T12:00:00.000Z",
      "completed_at": "2026-02-16T12:00:01.000Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "total_pages": 5,
    "has_more": true
  }
}`}</CodeBlock>
                  <ApiTryIt
                    method="GET"
                    endpoint="api-charges-list"
                    params={[
                      { name: "page", placeholder: "1", type: "query" },
                      { name: "limit", placeholder: "20", type: "query" },
                      { name: "status", placeholder: "completed", type: "query" },
                      { name: "from", placeholder: "2026-01-01", type: "query" },
                      { name: "to", placeholder: "2026-12-31", type: "query" },
                      { name: "reference", placeholder: "txn_88291", type: "query" },
                      { name: "user_id", placeholder: "uuid", type: "query" },
                    ]}
                    needsUserToken={false}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="webhooks" forceMount className="data-[state=inactive]:hidden">
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
                  <CodeBlock>{`{
  "event": "charge.completed",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "completed",
  "metadata": { "order_id": "ORD-123", "customer_email": "user@example.com" },
  "timestamp": "2026-02-16T12:00:00.000Z"
}`}</CodeBlock>
                  <h4 className="text-sm font-semibold mt-3">charge.partial_refund / charge.refunded</h4>
                  <CodeBlock>{`{
  "event": "charge.partial_refund",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.50,
  "reason": "Customer returned item",
  "status": "partial_refund",
  "timestamp": "2026-02-16T12:30:00.000Z"
}`}</CodeBlock>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Sandbox Mode Testing</h3>
                  <p className="text-sm text-muted-foreground">
                    When an API app is in <strong>Sandbox Mode</strong>, all charges are immediately completed without requiring:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Sufficient user wallet balance</li>
                    <li>PIN verification</li>
                    <li>Any balance deductions or transfers</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    This allows you to test your integration flow end-to-end without creating test accounts with funds. 
                    Webhooks are still sent, so you can verify your webhook endpoint integration.
                  </p>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-md mt-2">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Note:</strong> Sandbox responses include an <code className="text-amber-900">is_sandbox: true</code> field. 
                      Enable sandbox mode during development, then toggle it off before going to production.
                    </p>
                  </div>
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
                  <CodeBlock>{`const crypto = require('crypto');

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
});`}</CodeBlock>
                  <h4 className="text-sm font-semibold mt-3">Python Example:</h4>
                  <CodeBlock>{`import hashlib, hmac

def verify_webhook(body: str, signature: str, api_secret: str) -> bool:
    signing_key = hashlib.sha256(api_secret.encode()).hexdigest()
    computed = hmac.new(
        signing_key.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)`}</CodeBlock>
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

          <TabsContent value="errors" forceMount className="data-[state=inactive]:hidden">
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
                        <td className="py-2 pr-4"><code className="text-primary">429</code></td>
                        <td className="py-2 pr-4 font-mono text-xs">Rate limit exceeded</td>
                        <td className="py-2">Too many requests. Check <code className="text-primary">Retry-After</code> header for wait time in seconds.</td>
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
    </ApiCredentialsProvider>
  );
};

export default ApiDocs;
